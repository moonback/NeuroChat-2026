import { executeToolCall, rollbackExecutedToolCalls } from "./executor";
import { parseAgentStep } from "./parser";
import { buildPlannerPrompt } from "./planner";
import { ExecutionCritic } from "./critic";
import type { SkillRegistry } from "../skills/registry";
import type { NativeToolCallingGateway } from "./modelGateway";
import type { AgentModelGateway, AgentRunOptions, AgentRunResult, AgentExecutionState } from "./types";
import { ToolBroker } from "./toolBroker";

import { SkillRetriever } from "../skills/retriever";
import { AgentReflector } from "./reflector";
import { cancelDurableAgentRun, loadDurableAgentRun, saveDurableAgentRun } from "./runStore";

export class AgentOrchestrator {
  private critic = new ExecutionCritic();
  private retriever = new SkillRetriever();
  private reflector: AgentReflector;
  private broker: ToolBroker;

  constructor(
    private readonly model: AgentModelGateway,
    private readonly registry: SkillRegistry,
    private readonly options: { confirmAction?: (name: string, args: any) => Promise<boolean> } = {}
  ) {
    this.reflector = new AgentReflector(model);
    this.broker = new ToolBroker(registry, {
      sensitiveTools: ['pick_workdir', 'write_file', 'delete_file', 'run_command', 'shell_execute', 'send_email']
    }, options.confirmAction);
  }

  private async ensureSkillsIndexed() {
    if (!this.retriever.hasIndex()) {
      await this.retriever.index(this.registry.list());
    }
  }

  async run(input: string, sessionId: string, userId: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    await this.ensureSkillsIndexed();
    const relevantSkills = await this.retriever.retrieve(input);
    const candidateSkills = relevantSkills.length > 0 ? relevantSkills : this.registry.list().slice(0, 6);
    
    // Use broker to get actually available tools based on candidates
    const toolsForRun = this.broker.getAvailableTools(candidateSkills.map(s => s.name));
    const allowedToolNames = new Set(toolsForRun.map((skill) => skill.name));
    
    const runId = options.runId ?? options.resumeFromRunId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const deadlineAt = options.deadlineMs ? Date.now() + options.deadlineMs : undefined;
    const persisted = options.resumeFromRunId ? await loadDurableAgentRun(options.resumeFromRunId) : null;
    const state: AgentExecutionState = persisted?.state ?? {
      sessionId,
      userId,
      input,
      iteration: 0,
      maxIterations: options.maxIterations ?? 10,
      status: "IDLE",
      workingMemory: {
        currentGoal: input,
        attemptedActions: [],
        failedActions: [],
        extractedFacts: {},
        temporaryVariables: {},
      },
      dynamicPolicies: options.initialPolicies ?? [],
      transcript: [],
      toolResults: [],
      activeAgentId: options.activeProfile?.id,
      activeAgentName: options.activeProfile?.name,
      activeProfile: options.activeProfile,
    };
    state.status = persisted?.status === "CANCELLED" ? "CANCELLED" : state.status;
    state.maxIterations = options.maxIterations ?? state.maxIterations;
    state.activeProfile = options.activeProfile ?? state.activeProfile;
    const maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    let consecutiveFailures = 0;
    const persistState = async () => {
      await saveDurableAgentRun({ runId, sessionId, userId, input, status: state.status, updatedAt: Date.now(), state });
    };
    const failWithRollback = async (answer: string, reason: string): Promise<AgentRunResult> => {
      state.status = reason === "cancelled" ? "CANCELLED" : "FAILED";
      if (options.rollbackOnFailure !== false && !options.dryRun) {
        const rollbackResults = await rollbackExecutedToolCalls(this.registry, state, reason, options.signal);
        rollbackResults.forEach((result) => options.onEvent?.({ type: "rollback_result", iteration: state.iteration, result }));
      }
      await persistState();
      return { runId, answer, toolResults: state.toolResults, iterations: state.iteration, completed: false };
    };
    await persistState();

    while (state.iteration < state.maxIterations) {
      if (options.signal?.aborted || state.status === "CANCELLED") {
        await cancelDurableAgentRun(runId);
        return failWithRollback("Tâche agent annulée.", "cancelled");
      }
      if (deadlineAt && Date.now() > deadlineAt) {
        return failWithRollback("Budget temps dépassé avant la fin de la tâche.", "deadline_exceeded");
      }
      if (options.maxToolCalls !== undefined && state.toolResults.length >= options.maxToolCalls) {
        return failWithRollback("Budget outils dépassé avant la fin de la tâche.", "tool_budget_exceeded");
      }
      state.iteration += 1;
      state.status = "PLANNING";
      await persistState();
      options.onEvent?.({ type: "iteration_start", iteration: state.iteration });
      
      try {
        // 1. PLANNING
        const prompt = buildPlannerPrompt(state, candidateSkills);
        const nativeGateway = this.model as AgentModelGateway & Partial<NativeToolCallingGateway>;
        const step = typeof nativeGateway.completeStepWithTools === "function"
          ? await nativeGateway.completeStepWithTools(
              prompt,
              candidateSkills.map((skill) => ({ name: skill.name, description: skill.description, parameters: skill.parameters })),
              options.signal,
            )
          : parseAgentStep(await this.model.complete(prompt, options.signal));
        
        options.onEvent?.({ type: "model_response", iteration: state.iteration, raw: JSON.stringify(step) });
        state.transcript.push(`THOUGHT ${state.iteration}: ${step.thought}`);

        // 2. FINAL ANSWER CHECK
        if (step.finalAnswer) {
          state.status = "RESPONDING";
          options.onEvent?.({ type: "completed", iteration: state.iteration, completed: true, answer: step.finalAnswer });
          
          const result: AgentRunResult = { 
            runId,
            answer: step.finalAnswer, 
            toolResults: state.toolResults, 
            iterations: state.iteration, 
            completed: true 
          };
          
          try {
            const reflection = await this.reflector.reflect(state);
            if (reflection) state.transcript.push(`REFLECTION: ${JSON.stringify(reflection)}`);
          } catch {}
          
          await persistState();
          return result;
        }

        if (!step.toolCall) {
          throw new Error("L'agent n'a produit ni action ni réponse finale.");
        }

        if (!allowedToolNames.has(step.toolCall.name)) {
          throw new Error(`Tool ${step.toolCall.name} is outside the scoped allowlist for this run.`);
        }

        // 3. EXECUTING
        state.status = "EXECUTING";
        
        const context = {
          sessionId: state.sessionId,
          userId: state.userId,
          signal: options.signal,
          metadata: { reason: step.toolCall.reason, iteration: state.iteration },
        };

        const result = await this.broker.execute(
          step.toolCall.name, 
          step.toolCall.arguments, 
          context,
          { allowedTools: Array.from(allowedToolNames) }
        );

        state.toolResults.push(result);
        const observation = result.ok 
          ? `TOOL_OK ${step.toolCall.name}: ${JSON.stringify(result.data)}` 
          : `TOOL_ERR ${step.toolCall.name}: ${result.error}`;
        
        state.transcript.push(observation);
        state.workingMemory.attemptedActions.push(`${step.toolCall.name} at iteration ${state.iteration}`);
        
        if (!result.ok) {
          state.workingMemory.failedActions.push(`${step.toolCall.name}: ${result.error}`);
        } else {
          // Handle rollback stack manually for now or move it to broker
          if (this.registry.get(step.toolCall.name)?.rollback) {
            const stack = state.workingMemory.temporaryVariables["rollbackStack"] || [];
            if (Array.isArray(stack)) {
              stack.push({
                skill: step.toolCall.name,
                arguments: step.toolCall.arguments,
                data: result.data,
                iteration: state.iteration,
                timestamp: result.timestamp,
              });
              state.workingMemory.temporaryVariables["rollbackStack"] = stack;
            }
          }
        }
        
        const lastResult = state.toolResults[state.toolResults.length - 1];
        if (lastResult) options.onEvent?.({ type: "tool_result", iteration: state.iteration, result: lastResult });

        // 4. ANALYZING / CRITIC
        state.status = "ANALYZING";
        const criticism = await this.critic.evaluate(lastResult, state);
        state.transcript.push(`CRITIC ${state.iteration}: ${criticism.message} [Action: ${criticism.action}]`);

        if (criticism.action === "abort") {
          return failWithRollback(criticism.message, "critic_abort");
        }

        if (criticism.action === "retry" || criticism.action === "adjust_plan") {
           consecutiveFailures += 1;
           state.status = "RECOVERING";
        } else {
           consecutiveFailures = 0;
           state.status = "REFLECTING";
        }

      } catch (error: unknown) {
        consecutiveFailures += 1;
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        state.transcript.push(`LOOP_ERR ${state.iteration}: ${message}`);
        options.onEvent?.({ type: "loop_error", iteration: state.iteration, message });
        state.status = "RECOVERING";
      }

      await persistState();

      if (consecutiveFailures > maxConsecutiveFailures) {
        const answer = "Désolé, je rencontre trop de difficultés techniques pour finaliser cette tâche.";
        options.onEvent?.({ type: "completed", iteration: state.iteration, completed: false, answer });
        return failWithRollback(answer, "too_many_failures");
      }
    }

    state.status = "FAILED";
    const answer = "Je n'ai pas pu terminer la tâche dans le nombre d'itérations imparti.";
    options.onEvent?.({ type: "completed", iteration: state.iteration, completed: false, answer });

    const finalResult: AgentRunResult = { 
      runId,
      answer, 
      toolResults: state.toolResults, 
      iterations: state.iteration, 
      completed: false 
    };

    // 5. REFLECTION
    try {
      const reflection = await this.reflector.reflect(state);
      if (reflection) {
        state.transcript.push(`REFLECTION: ${JSON.stringify(reflection)}`);
        if (reflection.lessonsLearned.length > 0) {
          state.dynamicPolicies.push(...reflection.lessonsLearned.slice(0, 2));
        }
      }
    } catch (e) {
      console.warn("[Orchestrator] Reflection failed:", e);
    }

    if (options.rollbackOnFailure !== false && !options.dryRun) {
      const rollbackResults = await rollbackExecutedToolCalls(this.registry, state, "max_iterations_exceeded", options.signal);
      rollbackResults.forEach((result) => options.onEvent?.({ type: "rollback_result", iteration: state.iteration, result }));
      finalResult.toolResults = state.toolResults;
    }

    await persistState();
    return finalResult;
  }
}

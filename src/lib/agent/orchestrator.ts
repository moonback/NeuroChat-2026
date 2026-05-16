import { executeToolCall } from "./executor";
import { parseAgentStep } from "./parser";
import { buildPlannerPrompt } from "./planner";
import { ExecutionCritic } from "./critic";
import type { SkillRegistry } from "../skills/registry";
import type { NativeToolCallingGateway } from "./modelGateway";
import type { AgentModelGateway, AgentRunOptions, AgentRunResult, AgentExecutionState } from "./types";

import { SkillRetriever } from "../skills/retriever";
import { AgentReflector } from "./reflector";

export class AgentOrchestrator {
  private critic = new ExecutionCritic();
  private retriever = new SkillRetriever();
  private reflector: AgentReflector;

  constructor(
    private readonly model: AgentModelGateway,
    private readonly registry: SkillRegistry,
  ) {
    this.reflector = new AgentReflector(model);
  }

  private async ensureSkillsIndexed() {
    if (!this.retriever.hasIndex()) {
      await this.retriever.index(this.registry.list());
    }
  }

  async run(input: string, sessionId: string, userId: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    await this.ensureSkillsIndexed();
    const relevantSkills = await this.retriever.retrieve(input);
    
    const state: AgentExecutionState = {
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
    const maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    let consecutiveFailures = 0;

    while (state.iteration < state.maxIterations) {
      state.iteration += 1;
      state.status = "PLANNING";
      options.onEvent?.({ type: "iteration_start", iteration: state.iteration });
      
      try {
        // 1. PLANNING
        const prompt = buildPlannerPrompt(state, relevantSkills);
        const nativeGateway = this.model as AgentModelGateway & Partial<NativeToolCallingGateway>;
        const step = typeof nativeGateway.completeStepWithTools === "function"
          ? await nativeGateway.completeStepWithTools(
              prompt,
              this.registry.list().map((skill) => ({ name: skill.name, description: skill.description, parameters: skill.parameters })),
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
            answer: step.finalAnswer, 
            toolResults: state.toolResults, 
            iterations: state.iteration, 
            completed: true 
          };
          
          try {
            const reflection = await this.reflector.reflect(state);
            if (reflection) state.transcript.push(`REFLECTION: ${JSON.stringify(reflection)}`);
          } catch {}
          
          return result;
        }

        if (!step.toolCall) {
          throw new Error("L'agent n'a produit ni action ni réponse finale.");
        }

        // 3. EXECUTING
        state.status = "EXECUTING";
        const maxToolRetries = state.activeProfile?.maxRetries ?? 1;
        let toolRetryCount = 0;
        let toolSuccess = false;

        while (toolRetryCount <= maxToolRetries) {
          try {
            await executeToolCall(this.registry, state, step.toolCall, options.signal);
            const lastResult = state.toolResults[state.toolResults.length - 1];
            
            if (lastResult) {
              options.onEvent?.({ type: "tool_result", iteration: state.iteration, result: lastResult });
              
              // If success or we've exhausted retries, we move to analysis
              if (lastResult.success || !lastResult.message || toolRetryCount === maxToolRetries) {
                toolSuccess = lastResult.success;
                break;
              }
            }
          } catch (err) {
            if (toolRetryCount === maxToolRetries) throw err;
          }
          
          toolRetryCount++;
          state.transcript.push(`TOOL_RETRY ${state.iteration}.${toolRetryCount}: L'outil '${step.toolCall.name}' a échoué ou a renvoyé un résultat vide. Tentative de récupération...`);
        }

        const lastResult = state.toolResults[state.toolResults.length - 1];

        // 4. ANALYZING / CRITIC
        state.status = "ANALYZING";
        const criticism = await this.critic.evaluate(lastResult, state);
        state.transcript.push(`CRITIC ${state.iteration}: ${criticism.message} [Action: ${criticism.action}]`);

        if (criticism.action === "abort") {
          state.status = "FAILED";
          break;
        }

        if (criticism.action === "retry" || criticism.action === "adjust_plan" || !toolSuccess) {
           consecutiveFailures += 1;
           state.status = "RECOVERING";
           state.transcript.push(`SYSTEM: Échec consécutif ${consecutiveFailures}/${maxConsecutiveFailures}. Ajustement de la stratégie requis.`);
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

      if (consecutiveFailures >= maxConsecutiveFailures) {
        // Fallback: If we're not the supervisor, maybe the supervisor can help?
        // For now, we just fail gracefully with a better message.
        state.status = "FAILED";
        const answer = `Désolé, j'ai rencontré ${consecutiveFailures} erreurs consécutives. Je n'arrive pas à finaliser la tâche : ${state.transcript[state.transcript.length - 1]}`;
        options.onEvent?.({ type: "completed", iteration: state.iteration, completed: false, answer });
        return { answer, toolResults: state.toolResults, iterations: state.iteration, completed: false };
      }
    }

    state.status = "FAILED";
    const answer = "Je n'ai pas pu terminer la tâche dans le nombre d'itérations imparti.";
    options.onEvent?.({ type: "completed", iteration: state.iteration, completed: false, answer });

    const finalResult: AgentRunResult = { 
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

    return finalResult;
  }
}

import { executeToolCall } from "./executor";
import { parseAgentStep } from "./parser";
import { buildPlannerPrompt } from "./planner";
import type { SkillRegistry } from "../skills/registry";
import type { AgentModelGateway, AgentRunOptions, AgentRunResult, AgentExecutionState } from "./types";

export class AgentOrchestrator {
  constructor(
    private readonly model: AgentModelGateway,
    private readonly registry: SkillRegistry,
  ) {}

  async run(input: string, sessionId: string, userId: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const state: AgentExecutionState = {
      sessionId,
      userId,
      input,
      iteration: 0,
      maxIterations: options.maxIterations ?? 8,
      transcript: [],
      toolResults: [],
    };
    const maxConsecutiveFailures = options.maxConsecutiveFailures ?? 2;
    let consecutiveFailures = 0;

    while (state.iteration < state.maxIterations) {
      state.iteration += 1;
      try {
        const prompt = buildPlannerPrompt(state, this.registry.list());
        const raw = await this.model.complete(prompt, options.signal);
        const step = parseAgentStep(raw);

        state.transcript.push(`THOUGHT ${state.iteration}: ${step.thought}`);

        if (step.finalAnswer) {
          return { answer: step.finalAnswer, toolResults: state.toolResults, iterations: state.iteration, completed: true };
        }

        if (!step.toolCall) {
          throw new Error("L'agent n'a ni finalAnswer ni toolCall");
        }

        await executeToolCall(this.registry, state, step.toolCall, options.signal);

        const lastTool = state.toolResults[state.toolResults.length - 1];
        consecutiveFailures = lastTool?.ok ? 0 : consecutiveFailures + 1;
      } catch (error: unknown) {
        consecutiveFailures += 1;
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        state.transcript.push(`LOOP_ERR ${state.iteration}: ${message}`);
      }

      if (consecutiveFailures > maxConsecutiveFailures) {
        return {
          answer: "Je rencontre des erreurs répétées sur les outils. Reformule la demande ou précise davantage.",
          toolResults: state.toolResults,
          iterations: state.iteration,
          completed: false,
        };
      }
    }

    return {
      answer: "Je n'ai pas pu terminer dans la limite d'itérations. Réessaie avec une demande plus ciblée.",
      toolResults: state.toolResults,
      iterations: state.iteration,
      completed: false,
    };
  }
}

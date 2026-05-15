import { SkillRegistry } from "../skills/registry";
import { executeToolCall } from "./executor";
import { parseAgentStep } from "./parser";
import { buildPlannerPrompt } from "./planner";
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

    while (state.iteration < state.maxIterations) {
      state.iteration += 1;
      const prompt = buildPlannerPrompt(state, this.registry.list());
      const raw = await this.model.complete(prompt, options.signal);
      const step = parseAgentStep(raw);

      state.transcript.push(`THOUGHT ${state.iteration}: ${step.thought}`);

      if (step.finalAnswer) {
        return { answer: step.finalAnswer, toolResults: state.toolResults, iterations: state.iteration };
      }

      if (!step.toolCall) {
        throw new Error("L'agent n'a ni finalAnswer ni toolCall");
      }

      await executeToolCall(this.registry, state, step.toolCall, options.signal);
    }

    return {
      answer: "Je n'ai pas pu terminer dans la limite d'itérations. Réessaie avec une demande plus ciblée.",
      toolResults: state.toolResults,
      iterations: state.iteration,
    };
  }
}

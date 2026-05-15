import type { AgentExecutionState, AgentModelGateway } from "./types";

export interface Reflection {
  whatWorked: string[];
  whatFailed: string[];
  lessonsLearned: string[];
  suggestedGoalAdjustment?: string;
}

/**
 * AgentReflector performs post-execution analysis to extract 
 * lessons and improve future task performance.
 */
export class AgentReflector {
  constructor(private readonly model: AgentModelGateway) {}

  /**
   * Analyzes the session and produces a reflection.
   */
  async reflect(state: AgentExecutionState): Promise<Reflection | null> {
    // Only reflect if there were actual steps taken
    if (state.iteration < 2 && state.toolResults.length === 0) {
      return null;
    }

    const prompt = [
      "# SYSTEM: Agent Self-Reflection Layer",
      "Analyze the following agent execution transcript and extract structured insights.",
      "",
      "## Working Memory",
      JSON.stringify(state.workingMemory, null, 2),
      "",
      "## Execution Transcript",
      state.transcript.join("\n"),
      "",
      "## Instructions",
      "Identify successful patterns, failure points, and specific lessons learned.",
      "Respond ONLY with a valid JSON object.",
      "",
      "## Schema",
      "{",
      '  "whatWorked": ["list of strings"],',
      '  "whatFailed": ["list of strings"],',
      '  "lessonsLearned": ["list of strings"],',
      '  "suggestedGoalAdjustment": "string or null"',
      "}"
    ].join("\n");

    try {
      const response = await this.model.complete(prompt);
      const cleanJson = response.replace(/```json|```/g, "").trim();
      const reflection = JSON.parse(cleanJson) as Reflection;
      
      console.log("[Reflector] Generated reflection:", reflection);
      return reflection;
    } catch (err) {
      console.error("[Reflector] Failed to generate reflection:", err);
      return null;
    }
  }
}

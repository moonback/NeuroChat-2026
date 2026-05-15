import type { SkillExecutionResult } from "../skills/types";

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  reason?: string;
}

export interface AgentStep {
  thought: string;
  toolCall?: ToolCall;
  finalAnswer?: string;
}

export interface AgentExecutionState {
  sessionId: string;
  userId: string;
  input: string;
  iteration: number;
  maxIterations: number;
  transcript: string[];
  toolResults: SkillExecutionResult[];
}

export interface AgentModelGateway {
  complete(prompt: string, signal?: AbortSignal): Promise<string>;
}

export interface AgentRunOptions {
  maxIterations?: number;
  signal?: AbortSignal;
}

export interface AgentRunResult {
  answer: string;
  toolResults: SkillExecutionResult[];
  iterations: number;
}

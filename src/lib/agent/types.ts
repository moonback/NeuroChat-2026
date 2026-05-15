import type { SkillExecutionResult } from "../skills/types";

export type AgentStatus = 
  | "IDLE" 
  | "PLANNING" 
  | "EXECUTING" 
  | "ANALYZING" 
  | "REFLECTING" 
  | "RESPONDING" 
  | "FAILED" 
  | "RECOVERING";

export interface WorkingMemory {
  currentGoal: string;
  attemptedActions: string[];
  failedActions: string[];
  extractedFacts: Record<string, any>;
  temporaryVariables: Record<string, any>;
}

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
  status: AgentStatus;
  workingMemory: WorkingMemory;
  dynamicPolicies: string[];
  transcript: string[];
  toolResults: SkillExecutionResult[];
}

export interface AgentModelGateway {
  complete(prompt: string, signal?: AbortSignal): Promise<string>;
}

export type AgentEvent =
  | { type: "iteration_start"; iteration: number }
  | { type: "model_response"; iteration: number; raw: string }
  | { type: "tool_result"; iteration: number; result: SkillExecutionResult }
  | { type: "loop_error"; iteration: number; message: string }
  | { type: "completed"; iteration: number; completed: boolean; answer: string };

export interface AgentRunOptions {
  maxIterations?: number;
  maxConsecutiveFailures?: number;
  initialPolicies?: string[];
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
}

export interface AgentRunResult {
  answer: string;
  toolResults: SkillExecutionResult[];
  iterations: number;
  completed: boolean;
}

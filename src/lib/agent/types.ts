import type { SkillExecutionResult } from "../skills/types";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedSkills: string[]; // '*' for all, or array of skill names
}


export type AgentStatus = 
  | "IDLE" 
  | "PLANNING" 
  | "EXECUTING" 
  | "ANALYZING" 
  | "REFLECTING" 
  | "RESPONDING" 
  | "FAILED" 
  | "RECOVERING"
  | "CANCELLED";

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
  activeAgentId?: string;
  activeAgentName?: string;
  activeProfile?: AgentProfile;
}

export interface AgentModelGateway {
  complete(prompt: string, signal?: AbortSignal): Promise<string>;
}

export type AgentEvent =
  | { type: "agent_start"; agentId: string; agentName: string; input: string }
  | { type: "iteration_start"; iteration: number; agentId?: string; agentName?: string }
  | { type: "model_response"; iteration: number; raw: string; agentId?: string; agentName?: string }
  | { type: "tool_result"; iteration: number; result: SkillExecutionResult; agentId?: string; agentName?: string }
  | { type: "loop_error"; iteration: number; message: string; agentId?: string; agentName?: string }
  | { type: "delegation_start"; iteration: number; targetAgentId: string; targetAgentName: string; task: string; agentId?: string; agentName?: string }
  | { type: "completed"; iteration: number; completed: boolean; answer: string; agentId?: string; agentName?: string };

export interface AgentRunOptions {
  runId?: string;
  resumeFromRunId?: string;
  maxIterations?: number;
  maxConsecutiveFailures?: number;
  initialPolicies?: string[];
  signal?: AbortSignal;
  deadlineMs?: number;
  maxToolCalls?: number;
  dryRun?: boolean;
  onEvent?: (event: AgentEvent) => void;
  activeProfile?: AgentProfile;
}

export interface AgentRunResult {
  runId?: string;
  answer: string;
  toolResults: SkillExecutionResult[];
  iterations: number;
  completed: boolean;
}

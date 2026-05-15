import { createDefaultAgentRuntime } from "./createAgentRuntime";
import type { AgentRunOptions, AgentRunResult } from "./types";

export interface AgentServiceRequest {
  input: string;
  sessionId: string;
  userId: string;
  options?: AgentRunOptions;
}

export interface AgentRunner {
  run(input: string, sessionId: string, userId: string, options?: AgentRunOptions): Promise<AgentRunResult>;
}

export class AgentService {
  constructor(private readonly runtime: AgentRunner = createDefaultAgentRuntime()) {}

  async run(request: AgentServiceRequest): Promise<AgentRunResult> {
    return this.runtime.run(request.input, request.sessionId, request.userId, request.options);
  }
}

let singleton: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!singleton) singleton = new AgentService();
  return singleton;
}

export function setAgentServiceForTesting(service: AgentService | null): void {
  singleton = service;
}

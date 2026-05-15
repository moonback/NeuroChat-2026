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

function assertNonEmpty(value: string, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`AgentService: ${field} is required`);
  }
}

export class AgentService {
  constructor(private readonly runtime: AgentRunner = createDefaultAgentRuntime()) {}

  async run(request: AgentServiceRequest): Promise<AgentRunResult> {
    assertNonEmpty(request.input, "input");
    assertNonEmpty(request.sessionId, "sessionId");
    assertNonEmpty(request.userId, "userId");
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

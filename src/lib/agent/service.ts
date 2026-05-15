import type { AgentEvent, AgentRunOptions, AgentRunResult } from "./types";
import { saveAgentTrace } from "./traceStore";

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
  constructor(private readonly runtime: AgentRunner) {}

  async run(request: AgentServiceRequest): Promise<AgentRunResult> {
    assertNonEmpty(request.input, "input");
    assertNonEmpty(request.sessionId, "sessionId");
    assertNonEmpty(request.userId, "userId");

    const events: AgentEvent[] = [];
    const mergedOptions: AgentRunOptions = {
      ...request.options,
      onEvent: (event) => {
        events.push(event);
        request.options?.onEvent?.(event);
      },
    };

    const result = await this.runtime.run(request.input, request.sessionId, request.userId, mergedOptions);
    await saveAgentTrace({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: request.sessionId,
      userId: request.userId,
      timestamp: Date.now(),
      events,
    });
    return result;
  }
}

let singleton: AgentService | null = null;

/**
 * Singleton factory for AgentService.
 * Uses late-binding for createDefaultAgentRuntime to avoid circular dependency issues
 * during module initialization.
 */
export function getAgentService(): AgentService {
  if (!singleton) {
    // We import this lazily to break the circular dependency cycle
    // (Service -> Runtime -> Gateway -> ... potentially back to Service/Hooks)
    const { createDefaultAgentRuntime } = require("./createAgentRuntime");
    singleton = new AgentService(createDefaultAgentRuntime());
  }
  return singleton;
}

export function setAgentServiceForTesting(service: AgentService | null): void {
  singleton = service;
}

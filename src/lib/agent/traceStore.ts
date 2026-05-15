import type { AgentEvent } from "./types";

export interface AgentTraceEntry {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  events: AgentEvent[];
}

const TRACE_KEY = "neurochat_agent_traces";

export function saveAgentTrace(entry: AgentTraceEntry): void {
  try {
    const existing = loadAgentTraces();
    const next = [...existing, entry].slice(-200);
    localStorage.setItem(TRACE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function loadAgentTraces(): AgentTraceEntry[] {
  try {
    const raw = localStorage.getItem(TRACE_KEY);
    return raw ? (JSON.parse(raw) as AgentTraceEntry[]) : [];
  } catch {
    return [];
  }
}

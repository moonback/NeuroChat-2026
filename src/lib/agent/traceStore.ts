import { getStorageBackend } from "../storage";
import type { AgentEvent } from "./types";

export interface AgentTraceEntry {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  events: AgentEvent[];
}

export async function saveAgentTrace(entry: AgentTraceEntry): Promise<void> {
  try {
    await getStorageBackend().saveTrace(entry);
  } catch {
    // ignore storage errors
  }
}

export async function loadAgentTraces(): Promise<AgentTraceEntry[]> {
  try {
    return (await getStorageBackend().loadTraces()) as AgentTraceEntry[];
  } catch {
    return [];
  }
}

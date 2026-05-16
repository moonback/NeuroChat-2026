import { getStorageBackend } from "../storage";
import type { AgentExecutionState } from "./types";

const AGENT_RUNS_KEY = "neurochat_agent_runs_v1";
const MAX_AGENT_RUNS = 50;

export interface DurableAgentRun {
  runId: string;
  sessionId: string;
  userId: string;
  input: string;
  status: AgentExecutionState["status"] | "CANCELLED";
  updatedAt: number;
  state: AgentExecutionState;
}

async function loadRunMap(): Promise<Record<string, DurableAgentRun>> {
  try {
    const raw = await getStorageBackend().getItem(AGENT_RUNS_KEY);
    return raw ? JSON.parse(raw) as Record<string, DurableAgentRun> : {};
  } catch {
    return {};
  }
}

async function saveRunMap(runs: Record<string, DurableAgentRun>): Promise<void> {
  const entries = Object.values(runs)
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-MAX_AGENT_RUNS);
  await getStorageBackend().setItem(AGENT_RUNS_KEY, JSON.stringify(Object.fromEntries(entries.map((run) => [run.runId, run]))));
}

export async function saveDurableAgentRun(run: DurableAgentRun): Promise<void> {
  const runs = await loadRunMap();
  runs[run.runId] = run;
  await saveRunMap(runs);
}

export async function loadDurableAgentRun(runId: string): Promise<DurableAgentRun | null> {
  const runs = await loadRunMap();
  return runs[runId] ?? null;
}

export async function cancelDurableAgentRun(runId: string): Promise<void> {
  const runs = await loadRunMap();
  const run = runs[runId];
  if (!run) return;
  run.status = "CANCELLED";
  run.updatedAt = Date.now();
  run.state.status = "FAILED";
  run.state.transcript.push(`CANCELLED ${new Date(run.updatedAt).toISOString()}`);
  await saveRunMap(runs);
}

export async function loadDurableAgentRuns(): Promise<DurableAgentRun[]> {
  return Object.values(await loadRunMap()).sort((a, b) => b.updatedAt - a.updatedAt);
}

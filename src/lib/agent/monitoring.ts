import { loadAgentTraces } from "./traceStore";

export interface AgentMonitoringSnapshot {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  avgIterations: number;
  avgToolCalls: number;
  lastRunAt?: number;
}

export function getAgentMonitoringSnapshot(): AgentMonitoringSnapshot {
  const traces = loadAgentTraces();
  if (traces.length === 0) {
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      successRate: 0,
      avgIterations: 0,
      avgToolCalls: 0,
    };
  }

  const completedEvents = traces
    .map((trace) => trace.events.find((event) => event.type === "completed"))
    .filter((event): event is Extract<(typeof traces)[number]["events"][number], { type: "completed" }> => !!event);

  const successfulRuns = completedEvents.filter((event) => event.completed).length;
  const failedRuns = completedEvents.length - successfulRuns;

  const iterations = completedEvents.reduce((acc, event) => acc + event.iteration, 0);
  const toolCalls = traces.reduce(
    (acc, trace) => acc + trace.events.filter((event) => event.type === "tool_result").length,
    0,
  );

  return {
    totalRuns: traces.length,
    successfulRuns,
    failedRuns,
    successRate: completedEvents.length > 0 ? (successfulRuns / completedEvents.length) * 100 : 0,
    avgIterations: completedEvents.length > 0 ? iterations / completedEvents.length : 0,
    avgToolCalls: traces.length > 0 ? toolCalls / traces.length : 0,
    lastRunAt: traces[traces.length - 1]?.timestamp,
  };
}

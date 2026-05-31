import { beforeEach, describe, expect, it } from "vitest";

import { AgentOrchestrator } from "../lib/agent/orchestrator";
import { loadDurableAgentRun } from "../lib/agent/runStore";
import type { AgentModelGateway } from "../lib/agent/types";
import { SkillRegistry } from "../lib/skills/registry";

class SequenceGateway implements AgentModelGateway {
  private index = 0;
  constructor(private readonly responses: string[]) {}
  async complete(): Promise<string> {
    return this.responses[this.index++] ?? this.responses[this.responses.length - 1];
  }
}

function createRegistry(executions: string[], rollbacks: string[] = []) {
  const registry = new SkillRegistry();
  registry.register({
    name: "dangerous_write",
    description: "dangerous write",
    category: "system",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
    permissions: [],
    async execute(params) {
      executions.push(JSON.stringify(params));
      return { wrote: true };
    },
    async rollback(params, result, context) {
      rollbacks.push(JSON.stringify({ params, result, reason: context.reason }));
      return { reverted: true };
    },
  });
  return registry;
}

describe("Agent durable runs and dry-run tools", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists run state and previews tool calls without executing them", async () => {
    const executions: string[] = [];
    const model = new SequenceGateway([
      JSON.stringify({ thought: "preview", toolCall: { name: "dangerous_write", arguments: { path: "/tmp/a" }, reason: "test" } }),
      JSON.stringify({ thought: "done", finalAnswer: "finished" }),
    ]);
    const orchestrator = new AgentOrchestrator(model, createRegistry(executions));

    const result = await orchestrator.run("write file", "session-1", "user-1", { runId: "run-1", dryRun: true, maxIterations: 2 });

    expect(result.completed).toBe(true);
    expect(result.runId).toBe("run-1");
    expect(executions).toEqual([]);
    expect(result.toolResults[0]).toMatchObject({
      ok: true,
      skill: "dangerous_write",
      data: { preview: true, arguments: { path: "/tmp/a" }, reason: "test" },
    });
    const stored = await loadDurableAgentRun("run-1");
    expect(stored?.state.transcript.some((line) => line.startsWith("TOOL_DRY_RUN dangerous_write"))).toBe(true);
  });

  it("rolls back reversible tool calls when a tool budget stops the run", async () => {
    const executions: string[] = [];
    const rollbacks: string[] = [];
    const model = new SequenceGateway([
      JSON.stringify({ thought: "tool", toolCall: { name: "dangerous_write", arguments: { path: "/tmp/a" } } }),
      JSON.stringify({ thought: "tool again", toolCall: { name: "dangerous_write", arguments: { path: "/tmp/b" } } }),
    ]);
    const orchestrator = new AgentOrchestrator(model, createRegistry(executions, rollbacks));

    const result = await orchestrator.run("write twice", "session-1", "user-1", { runId: "budget-run", maxIterations: 3, maxToolCalls: 1 });

    expect(result.completed).toBe(false);
    expect(result.answer).toContain("Budget outils");
    expect(executions).toHaveLength(1);
    expect(rollbacks).toHaveLength(1);
    expect(rollbacks[0]).toContain("tool_budget_exceeded");
    expect(result.toolResults.some((toolResult) => toolResult.skill === "dangerous_write:rollback" && toolResult.ok)).toBe(true);
    const stored = await loadDurableAgentRun("budget-run");
    expect(stored?.status).toBe("FAILED");
  });
});

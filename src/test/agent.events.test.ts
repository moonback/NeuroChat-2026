import { describe, expect, it, vi } from "vitest";
import { AgentOrchestrator } from "../lib/agent/orchestrator";
import { SkillRegistry } from "../lib/skills/registry";

describe("AgentOrchestrator events", () => {
  it("emits lifecycle events", async () => {
    const registry = new SkillRegistry();
    registry.register({
      name: "echo",
      description: "echo",
      category: "system",
      parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
      permissions: [],
      async execute(params: { text: string }) {
        return { out: params.text };
      },
    });

    const model = {
      async complete() {
        return '{"thought":"done","toolCall":{"name":"echo","arguments":{"text":"hi"}}}';
      },
    };

    const onEvent = vi.fn();
    const result = await new AgentOrchestrator(model, registry).run("x", "s", "u", { maxIterations: 1, onEvent });

    expect(result.completed).toBe(false);
    expect(onEvent).toHaveBeenCalled();
    const types = onEvent.mock.calls.map((call) => call[0].type);
    expect(types).toContain("iteration_start");
    expect(types).toContain("model_response");
    expect(types).toContain("tool_result");
    expect(types).toContain("completed");
  });
});

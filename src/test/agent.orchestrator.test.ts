import { describe, expect, it } from "vitest";
import { AgentOrchestrator } from "../lib/agent/orchestrator";
import { SkillRegistry } from "../lib/skills/registry";

describe("AgentOrchestrator", () => {
  it("executes a tool then returns final answer", async () => {
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

    const outputs = [
      '{"thought":"call echo","toolCall":{"name":"echo","arguments":{"text":"hello"}}}',
      '{"thought":"done","finalAnswer":"Salut!"}',
    ];

    const model = {
      async complete() {
        return outputs.shift() ?? '{"thought":"fallback","finalAnswer":"x"}';
      },
    };

    const result = await new AgentOrchestrator(model, registry).run("say hi", "s1", "u1", { maxIterations: 4 });
    expect(result.completed).toBe(true);
    expect(result.answer).toBe("Salut!");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0].ok).toBe(true);
  });

  it("stops after repeated parse errors", async () => {
    const registry = new SkillRegistry();
    const model = {
      async complete() {
        return "not-json";
      },
    };

    const result = await new AgentOrchestrator(model, registry).run("x", "s", "u", { maxIterations: 5, maxConsecutiveFailures: 1 });
    expect(result.completed).toBe(false);
    expect(result.answer).toContain("erreurs répétées");
  });
});

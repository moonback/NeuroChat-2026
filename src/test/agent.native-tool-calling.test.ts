import { describe, expect, it, vi } from "vitest";
import { AgentOrchestrator } from "../lib/agent/orchestrator";
import { SkillRegistry } from "../lib/skills/registry";
import { OpenRouterAgentGateway } from "../lib/agent/modelGateway";

describe("native tool-calling path", () => {
  it("orchestrator prioritizes completeStepWithTools when available", async () => {
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
      complete: vi.fn().mockResolvedValue('{"thought":"legacy","finalAnswer":"legacy"}'),
      completeStepWithTools: vi
        .fn()
        .mockResolvedValueOnce({ thought: "tool", toolCall: { name: "echo", arguments: { text: "hello" } } })
        .mockResolvedValueOnce({ thought: "done", finalAnswer: "ok" }),
    };

    const result = await new AgentOrchestrator(model, registry).run("x", "s", "u", { maxIterations: 3 });
    expect(result.completed).toBe(true);
    expect(result.answer).toBe("ok");
    expect(model.completeStepWithTools).toHaveBeenCalled();
    // One call expected for Reflection
    expect(model.complete).toHaveBeenCalledTimes(1);
  });

  it("OpenRouter gateway maps tool_calls to AgentStep", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: { name: "open_website", arguments: '{"url":"https://example.com"}' },
                },
              ],
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_OPENROUTER_API_KEY", "test-key");

    const gateway = new OpenRouterAgentGateway();
    const step = await gateway.completeStepWithTools("prompt", [
      { name: "open_website", description: "Open URL", parameters: { type: "object", properties: { url: { type: "string" } } } },
    ]);

    expect(step.toolCall?.name).toBe("open_website");
    expect(step.toolCall?.arguments).toEqual({ url: "https://example.com" });
  });
});

import { describe, expect, it, vi } from "vitest";
import { SkillRegistry } from "../lib/skills/registry";

describe("SkillRegistry", () => {
  it("executes a registered skill", async () => {
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

    const res = await registry.execute("echo", { text: "hello" }, { sessionId: "s", userId: "u" });
    expect(res.ok).toBe(true);
    expect((res.data as { out: string }).out).toBe("hello");
  });

  it("validates parameters", async () => {
    const registry = new SkillRegistry();
    registry.register({
      name: "strict",
      description: "strict",
      category: "system",
      parameters: { type: "object", properties: { n: { type: "number" } }, required: ["n"], additionalProperties: false },
      permissions: [],
      async execute() {
        return { ok: true };
      },
    });

    const res = await registry.execute("strict", { n: "bad" }, { sessionId: "s", userId: "u" });
    expect(res.ok).toBe(false);
  });

  it("supports confirmation hook", async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    const registry = new SkillRegistry(undefined, confirm);
    registry.register({
      name: "danger",
      description: "danger",
      category: "system",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      permissions: [],
      requiresConfirmation: true,
      async execute() {
        return { ok: true };
      },
    });

    const res = await registry.execute("danger", {}, { sessionId: "s", userId: "u" });
    expect(res.ok).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });
});

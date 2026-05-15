import { describe, expect, it } from "vitest";
import { FallbackAgentGateway } from "../lib/agent/modelGateway";

describe("FallbackAgentGateway", () => {
  it("falls back to next gateway when previous fails", async () => {
    const first = { async complete() { throw new Error("primary down"); } };
    const second = { async complete() { return '{"thought":"ok","finalAnswer":"done"}'; } };

    const gateway = new FallbackAgentGateway([first, second]);
    const out = await gateway.complete("prompt");
    expect(out).toContain("finalAnswer");
  });

  it("throws when all gateways fail", async () => {
    const first = { async complete() { throw new Error("a"); } };
    const second = { async complete() { throw new Error("b"); } };

    const gateway = new FallbackAgentGateway([first, second]);
    await expect(gateway.complete("prompt")).rejects.toThrow("b");
  });
});

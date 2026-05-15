import { describe, expect, it } from "vitest";
import { parseAgentStep } from "../lib/agent/parser";

describe("parseAgentStep", () => {
  it("parses final answer", () => {
    const step = parseAgentStep('{"thought":"done","finalAnswer":"ok"}');
    expect(step.finalAnswer).toBe("ok");
  });

  it("rejects both toolCall and finalAnswer", () => {
    expect(() => parseAgentStep('{"thought":"x","finalAnswer":"y","toolCall":{"name":"a","arguments":{}}}')).toThrow();
  });
});

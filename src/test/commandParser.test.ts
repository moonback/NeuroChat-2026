import { describe, expect, it } from "vitest";
import {
  containsBrowserCommand,
  extractAllCommands,
  parseAssistantResponse,
} from "../lib/commandParser";

describe("commandParser", () => {
  it("detects browser commands consistently across repeated calls", () => {
    const input = "va sur youtube";

    expect(containsBrowserCommand(input)).toBe(true);
    expect(containsBrowserCommand(input)).toBe(true);
    expect(containsBrowserCommand(input)).toBe(true);
  });

  it("parses navigation commands with confirmation enabled", () => {
    const result = parseAssistantResponse("ouvre google");

    expect(result.action).not.toBeNull();
    expect(result.action?.type).toBe("navigate");
    expect(result.action?.requiresConfirmation).toBe(true);
  });

  it("extracts deterministic command sets on repeated parsing", () => {
    const input = "va sur youtube puis recharge la page";

    const first = extractAllCommands(input);
    const second = extractAllCommands(input);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });
});

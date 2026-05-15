import { describe, expect, it } from "vitest";
import { AgentService } from "../lib/agent/service";

describe("AgentService", () => {
  it("forwards run payload to runtime", async () => {
    const runtime = {
      async run(input: string, sessionId: string, userId: string) {
        return {
          answer: `${input}:${sessionId}:${userId}`,
          toolResults: [],
          iterations: 1,
          completed: true,
        };
      },
    };

    const service = new AgentService(runtime);
    const result = await service.run({ input: "hello", sessionId: "s1", userId: "u1" });
    expect(result.answer).toBe("hello:s1:u1");
    expect(result.completed).toBe(true);
  });

  it("rejects invalid empty payload fields", async () => {
    const runtime = {
      async run() {
        return { answer: "x", toolResults: [], iterations: 1, completed: true };
      },
    };
    const service = new AgentService(runtime);

    await expect(service.run({ input: "", sessionId: "s1", userId: "u1" })).rejects.toThrow("input");
    await expect(service.run({ input: "ok", sessionId: "", userId: "u1" })).rejects.toThrow("sessionId");
    await expect(service.run({ input: "ok", sessionId: "s1", userId: "" })).rejects.toThrow("userId");
  });
});

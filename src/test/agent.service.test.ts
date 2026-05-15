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
});

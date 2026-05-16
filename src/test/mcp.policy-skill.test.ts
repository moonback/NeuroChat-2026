import { beforeEach, describe, expect, it, vi } from "vitest";
import { callMcpToolSkill } from "../lib/skills/mcp/callMcpToolSkill";
import { saveMcpPolicyConfig } from "../lib/skills/mcpPolicyStore";

describe("sandboxed MCP skill", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("rejects non-allowlisted MCP calls", async () => {
    await saveMcpPolicyConfig({ servers: [] });
    await expect(callMcpToolSkill.execute({ serverId: "local", toolName: "read" }, { sessionId: "s", userId: "u" })).rejects.toThrow("MCP refusé");
  });

  it("calls only allowlisted HTTP MCP tools", async () => {
    await saveMcpPolicyConfig({ servers: [{ id: "local", endpoint: "http://127.0.0.1:3333/mcp", allowedTools: ["read"] }] });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, headers: new Headers({ "content-length": "22" }), text: async () => JSON.stringify({ result: { ok: true } }) } as Response);

    const result = await callMcpToolSkill.execute({ serverId: "local", toolName: "read", arguments: { path: "README.md" } }, { sessionId: "s", userId: "u" });

    expect(result).toEqual({ serverId: "local", toolName: "read", result: { ok: true } });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3333/mcp", expect.objectContaining({ method: "POST" }));
  });

  it("rejects remote plain HTTP MCP endpoints at policy save time", async () => {
    await expect(saveMcpPolicyConfig({ servers: [{ id: "remote", endpoint: "http://example.com/mcp", allowedTools: ["read"] }] })).rejects.toThrow("Endpoint MCP refusé");
  });
});

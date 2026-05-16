import type { SkillDefinition } from "../types";
import { findAllowedMcpServer } from "../mcpPolicyStore";

interface CallMcpToolParams {
  serverId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

export const callMcpToolSkill: SkillDefinition<CallMcpToolParams, { serverId: string; toolName: string; result: unknown }> = {
  name: "call_mcp_tool",
  description: "Appelle un outil MCP HTTP explicitement allowlisté par la politique MCP locale.",
  category: "system",
  riskLevel: "high",
  requiresConfirmation: true,
  permissions: [{ resource: "mcp", level: "execute" }],
  parameters: {
    type: "object",
    properties: {
      serverId: { type: "string", description: "Identifiant du serveur MCP allowlisté" },
      toolName: { type: "string", description: "Nom de l'outil MCP allowlisté" },
      arguments: { type: "object", description: "Arguments JSON de l'outil" },
    },
    required: ["serverId", "toolName"],
    additionalProperties: false,
  },
  async execute(params, context) {
    const server = await findAllowedMcpServer(params.serverId, params.toolName);
    if (!server) {
      throw new Error(`MCP refusé: serveur '${params.serverId}' ou outil '${params.toolName}' non allowlisté, expiré ou hors politique.`);
    }

    const response = await fetch(server.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${context.sessionId}-${Date.now()}`,
        method: "tools/call",
        params: { name: params.toolName, arguments: params.arguments ?? {} },
      }),
      signal: context.signal,
    });

    if (!response.ok) {
      throw new Error(`MCP HTTP ${response.status}`);
    }

    const payload = await response.json() as { result?: unknown; error?: { message?: string } };
    if (payload.error) {
      throw new Error(payload.error.message ?? "Erreur MCP inconnue");
    }

    return { serverId: params.serverId, toolName: params.toolName, result: payload.result };
  },
};

import { getStorageBackend } from "../storage";

export const MCP_POLICY_KEY = "neurochat_mcp_policy_v1";

export interface McpServerPolicy {
  id: string;
  endpoint: string;
  allowedTools: string[];
  expiresAt?: number;
}

export interface McpPolicyConfig {
  servers: McpServerPolicy[];
}

export async function loadMcpPolicyConfig(): Promise<McpPolicyConfig> {
  try {
    const raw = await getStorageBackend().getItem(MCP_POLICY_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<McpPolicyConfig> : {};
    return { servers: Array.isArray(parsed.servers) ? parsed.servers : [] };
  } catch {
    return { servers: [] };
  }
}

export async function saveMcpPolicyConfig(config: McpPolicyConfig): Promise<void> {
  await getStorageBackend().setItem(MCP_POLICY_KEY, JSON.stringify(config));
}

export async function findAllowedMcpServer(serverId: string, toolName: string): Promise<McpServerPolicy | null> {
  const policy = await loadMcpPolicyConfig();
  const server = policy.servers.find((item) => item.id === serverId);
  if (!server) return null;
  if (server.expiresAt && Date.now() > server.expiresAt) return null;
  if (!server.allowedTools.includes(toolName)) return null;
  return server;
}

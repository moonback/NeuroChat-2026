import { getStorageBackend } from "../storage";

export const MCP_POLICY_KEY = "neurochat_mcp_policy_v1";
const MAX_ALLOWED_TOOLS = 50;

export interface McpServerPolicy {
  id: string;
  endpoint: string;
  allowedTools: string[];
  expiresAt?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface McpPolicyConfig {
  servers: McpServerPolicy[];
}

export function validateMcpEndpoint(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Endpoint MCP invalide");
  }

  if (url.username || url.password) throw new Error("Endpoint MCP avec identifiants refusé");
  const hostname = url.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
    throw new Error("Endpoint MCP refusé: utiliser HTTPS ou HTTP localhost uniquement");
  }

  url.hash = "";
  return url.toString();
}

function normalizeServerPolicy(server: Partial<McpServerPolicy>): McpServerPolicy | null {
  if (!server.id || typeof server.id !== "string") return null;
  if (!server.endpoint || typeof server.endpoint !== "string") return null;
  if (!Array.isArray(server.allowedTools)) return null;

  const allowedTools = Array.from(new Set(server.allowedTools.filter((tool): tool is string => typeof tool === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(tool)))).slice(0, MAX_ALLOWED_TOOLS);
  if (allowedTools.length === 0) return null;

  return {
    id: server.id.slice(0, 128),
    endpoint: validateMcpEndpoint(server.endpoint),
    allowedTools,
    expiresAt: typeof server.expiresAt === "number" ? server.expiresAt : undefined,
    timeoutMs: typeof server.timeoutMs === "number" ? Math.min(Math.max(server.timeoutMs, 500), 30_000) : undefined,
    maxResponseBytes: typeof server.maxResponseBytes === "number" ? Math.min(Math.max(server.maxResponseBytes, 1024), 2_000_000) : undefined,
  };
}

export function normalizeMcpPolicyConfig(config: Partial<McpPolicyConfig>): McpPolicyConfig {
  const servers = Array.isArray(config.servers) ? config.servers : [];
  return { servers: servers.map(normalizeServerPolicy).filter((server): server is McpServerPolicy => Boolean(server)) };
}

export async function loadMcpPolicyConfig(): Promise<McpPolicyConfig> {
  try {
    const raw = await getStorageBackend().getItem(MCP_POLICY_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<McpPolicyConfig> : {};
    return normalizeMcpPolicyConfig(parsed);
  } catch {
    return { servers: [] };
  }
}

export async function saveMcpPolicyConfig(config: McpPolicyConfig): Promise<void> {
  await getStorageBackend().setItem(MCP_POLICY_KEY, JSON.stringify(normalizeMcpPolicyConfig(config)));
}

export async function findAllowedMcpServer(serverId: string, toolName: string): Promise<McpServerPolicy | null> {
  const policy = await loadMcpPolicyConfig();
  const server = policy.servers.find((item) => item.id === serverId);
  if (!server) return null;
  if (server.expiresAt && Date.now() > server.expiresAt) return null;
  if (!server.allowedTools.includes(toolName)) return null;
  return server;
}

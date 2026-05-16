import { createDefaultSkillRegistry } from "../skills";
import { AgentSupervisor } from "./supervisor";
import { FallbackAgentGateway, GeminiAgentGateway, OllamaAgentGateway, OpenRouterAgentGateway } from "./modelGateway";
import type { AgentModelGateway } from "./types";

export function createDefaultAgentRuntime(): AgentSupervisor {
  const gateways: AgentModelGateway[] = [new OpenRouterAgentGateway()];
  if (import.meta.env.VITE_OLLAMA_BASE_URL || import.meta.env.VITE_OLLAMA_MODEL) {
    gateways.push(new OllamaAgentGateway());
  }
  gateways.push(new GeminiAgentGateway());
  const gateway = new FallbackAgentGateway(gateways);
  const registry = createDefaultSkillRegistry();
  return new AgentSupervisor(gateway, registry);
}

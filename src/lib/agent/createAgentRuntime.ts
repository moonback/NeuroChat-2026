import { createDefaultSkillRegistry } from "../skills";
import { AgentSupervisor } from "./supervisor";
import { FallbackAgentGateway, GeminiAgentGateway, OpenRouterAgentGateway } from "./modelGateway";

export function createDefaultAgentRuntime(): AgentSupervisor {
  const gateway = new FallbackAgentGateway([
    new OpenRouterAgentGateway(),
    new GeminiAgentGateway(),
  ]);
  const registry = createDefaultSkillRegistry();
  return new AgentSupervisor(gateway, registry);
}

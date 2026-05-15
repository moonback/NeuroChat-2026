import { createDefaultSkillRegistry } from "../skills";
import { AgentOrchestrator } from "./orchestrator";
import { FallbackAgentGateway, GeminiAgentGateway, OpenRouterAgentGateway } from "./modelGateway";

export function createDefaultAgentRuntime(): AgentOrchestrator {
  const gateway = new FallbackAgentGateway([
    new GeminiAgentGateway(),
    new OpenRouterAgentGateway(),
  ]);
  const registry = createDefaultSkillRegistry();
  return new AgentOrchestrator(gateway, registry);
}

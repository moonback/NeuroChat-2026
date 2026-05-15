import { createDefaultSkillRegistry } from "../skills";
import { AgentOrchestrator } from "./orchestrator";
import { FallbackAgentGateway, OpenRouterAgentGateway } from "./modelGateway";

export function createDefaultAgentRuntime(): AgentOrchestrator {
  const gateway = new FallbackAgentGateway([
    new OpenRouterAgentGateway(),
  ]);
  const registry = createDefaultSkillRegistry();
  return new AgentOrchestrator(gateway, registry);
}

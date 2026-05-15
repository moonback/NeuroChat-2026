import { createDefaultSkillRegistry } from "../skills";
import { AgentOrchestrator } from "./orchestrator";
import { OpenRouterAgentGateway } from "./modelGateway";

export function createDefaultAgentRuntime(): AgentOrchestrator {
  const gateway = new OpenRouterAgentGateway();
  const registry = createDefaultSkillRegistry();
  return new AgentOrchestrator(gateway, registry);
}

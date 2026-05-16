import { SkillRegistry } from "../skills/registry";
import { SkillContext, SkillExecutionResult } from "../skills/types";
import { runtimeEvents } from "../../runtime/events";

export interface ToolBrokerPolicy {
  allowedTools: string[]; // List of skill names allowed for this run
  requireConfirmationForAll: boolean;
  sensitiveTools?: string[]; // Tools that always require confirmation
  maxExecutionTimeMs?: number;
}

/**
 * ToolBroker
 * Acts as a security and governance layer between the Agent and the SkillRegistry.
 * Enforces per-run allowlists and execution policies.
 */
export class ToolBroker {
  constructor(
    private readonly registry: SkillRegistry,
    private readonly globalPolicy: Partial<ToolBrokerPolicy> = {},
    private readonly confirmAction?: (name: string, args: any) => Promise<boolean>
  ) {}

  /**
   * List available tools for the current session/run.
   * If an allowlist is provided, only tools in that list (and existing in the registry) are returned.
   */
  getAvailableTools(allowlist?: string[]) {
    const allSkills = this.registry.list();
    const allowed = allowlist || this.globalPolicy.allowedTools;

    if (!allowed || allowed.includes('*')) {
      return allSkills;
    }

    return allSkills.filter(s => allowed.includes(s.name));
  }

  /**
   * Execute a tool through the broker.
   */
  async execute(
    name: string, 
    params: any, 
    context: SkillContext, 
    runPolicy?: Partial<ToolBrokerPolicy>
  ): Promise<SkillExecutionResult> {
    const allowed = runPolicy?.allowedTools || this.globalPolicy.allowedTools;
    
    // Check allowlist
    if (allowed && !allowed.includes('*') && !allowed.includes(name)) {
      const error = `Tool '${name}' is not in the allowlist for this run.`;
      console.warn(`[ToolBroker] Blocked execution: ${error}`);
      return {
        ok: false,
        skill: name,
        error,
        elapsedMs: 0,
        timestamp: Date.now()
      };
    }

    // Emit event for observability
    runtimeEvents.emit('agent:tool:call', { tool: name, args: params });

    // Check if confirmation is required
    const requiresConfirmation = 
      runPolicy?.requireConfirmationForAll || 
      this.globalPolicy.requireConfirmationForAll ||
      this.globalPolicy.sensitiveTools?.includes(name);

    if (requiresConfirmation && this.confirmAction) {
      console.log(`[ToolBroker] Requesting confirmation for tool: ${name}`);
      const approved = await this.confirmAction(name, params);
      if (!approved) {
        console.warn(`[ToolBroker] Action denied by user: ${name}`);
        return {
          ok: false,
          skill: name,
          error: "Action annulée par l'utilisateur.",
          elapsedMs: 0,
          timestamp: Date.now()
        };
      }
    }

    // Execute via registry
    const result = await this.registry.execute(name, params, context);

    if (!result.ok) {
      console.error(`[ToolBroker] Execution failed for '${name}': ${result.error}`);
    }

    return result;
  }
}

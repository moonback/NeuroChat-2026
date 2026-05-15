import { AgentOrchestrator } from "./orchestrator";
import { getAgentProfile, SUPERVISOR_PROFILE } from "./profiles";
import type { SkillRegistry } from "../skills/registry";
import type { AgentModelGateway, AgentRunOptions, AgentRunResult, AgentEvent } from "./types";
import { delegateTaskSkill } from "../skills/delegateTask";
import type { SkillContext, SkillDefinition } from "../skills/types";

export class AgentSupervisor {
  constructor(
    private readonly model: AgentModelGateway,
    private readonly fullRegistry: SkillRegistry,
  ) {}

  /**
   * Main entry point for user requests. Runs the Supervisor profile.
   */
  async run(input: string, sessionId: string, userId: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    return this.runSubAgent(SUPERVISOR_PROFILE.id, input, sessionId, userId, options);
  }

  /**
   * Runs a specific agent profile. This is exposed to the delegateTask skill.
   */
  async runSubAgent(
    agentId: string, 
    input: string, 
    sessionId: string, 
    userId: string, 
    options: AgentRunOptions = {}
  ): Promise<AgentRunResult> {
    const profile = getAgentProfile(agentId);
    if (!profile) {
      throw new Error(`Agent profile '${agentId}' not found.`);
    }

    // Create a scoped registry for this agent based on allowedSkills
    const scopedRegistry = this.createScopedRegistry(profile.allowedSkills);

    // If it's the supervisor (or an agent with '*'), we also inject the delegateTask skill
    if (profile.allowedSkills.includes("*") || profile.allowedSkills.includes("delegateTask")) {
      // Create a wrapper for delegateTask that injects the runSubAgent function into the context
      const delegateWrapper: SkillDefinition = {
        ...delegateTaskSkill,
        execute: async (params: any, context: SkillContext) => {
          const augmentedContext = {
            ...context,
            metadata: {
              ...context.metadata,
              runSubAgent: (targetId: string, taskInput: string, sId: string, uId: string) => {
                // Emit an event that we are delegating
                options.onEvent?.({
                  type: "delegation_start",
                  iteration: 0,
                  targetAgentId: targetId,
                  targetAgentName: getAgentProfile(targetId)?.name || targetId,
                  task: taskInput
                });
                return this.runSubAgent(targetId, taskInput, sId, uId, options);
              }
            }
          };
          return delegateTaskSkill.execute(params, augmentedContext);
        }
      };
      scopedRegistry.register(delegateWrapper);
    }

    // Decorate the onEvent callback to inject the active agent information
    const decoratedOptions: AgentRunOptions = {
      ...options,
      onEvent: (event: AgentEvent) => {
        if (event.type !== "delegation_start" && event.type !== "agent_start") {
          // Add agent context to standard events
          (event as any).agentId = profile.id;
          (event as any).agentName = profile.name;
        }
        options.onEvent?.(event);
      }
    };

    // Emit start event
    decoratedOptions.onEvent?.({
      type: "agent_start",
      agentId: profile.id,
      agentName: profile.name,
      input: input
    });

    console.log(`[Supervisor] Starting agent '${profile.name}' (${profile.id}) for task: ${input.slice(0, 50)}...`);

    // We instantiate a new orchestrator for this specific run
    const orchestrator = new AgentOrchestrator(this.model, scopedRegistry);
    
    // We run it. We need to pass the profile in options if we want to modify state. 
    // Wait, the planner uses state.activeProfile. Let's patch orchestrator to accept activeProfile.
    // Actually, I can pass it via options.initialPolicies or inject it.
    // For now, I'll let orchestrator accept activeProfile in the run options, or modify orchestrator.run to set it.
    
    // Quick workaround: I can pass it by modifying the state, but `orchestrator.run` initializes its own state.
    // Let's modify `AgentOrchestrator` to accept `activeProfile` in `AgentRunOptions`.
    
    return orchestrator.run(input, sessionId, userId, { ...decoratedOptions, activeProfile: profile } as any);
  }

  private createScopedRegistry(allowedSkills: string[]) {
    // If '*' is allowed, clone the full registry
    if (allowedSkills.includes("*")) {
      const clone = { ...this.fullRegistry } as any; // simplified clone for this example, or just use the same instance?
      // Since SkillRegistry just has a Map, we can instantiate a new one and copy.
      // Assuming SkillRegistry has a `list()` method.
      const registry = new (this.fullRegistry.constructor as any)();
      for (const skill of this.fullRegistry.list()) {
        registry.register(skill);
      }
      return registry;
    }

    // Otherwise, create a restricted registry
    const registry = new (this.fullRegistry.constructor as any)();
    for (const skill of this.fullRegistry.list()) {
      if (allowedSkills.includes(skill.name)) {
        registry.register(skill);
      }
    }
    return registry;
  }
}

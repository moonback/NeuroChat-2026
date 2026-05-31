import type { SkillRegistry } from "../skills/registry";
import type { AgentExecutionState, AgentRollbackEntry, ToolCall } from "./types";

const ROLLBACK_STACK_KEY = "rollbackStack";

function getRollbackStack(state: AgentExecutionState): AgentRollbackEntry[] {
  const existing = state.workingMemory.temporaryVariables[ROLLBACK_STACK_KEY];
  if (Array.isArray(existing)) return existing as AgentRollbackEntry[];
  const created: AgentRollbackEntry[] = [];
  state.workingMemory.temporaryVariables[ROLLBACK_STACK_KEY] = created;
  return created;
}

export async function executeToolCall(
  registry: SkillRegistry,
  state: AgentExecutionState,
  toolCall: ToolCall,
  signal?: AbortSignal,
  dryRun = false,
): Promise<void> {
  if (dryRun) {
    const result = {
      ok: true,
      skill: toolCall.name,
      data: { preview: true, arguments: toolCall.arguments, reason: toolCall.reason, reversible: Boolean(registry.get(toolCall.name)?.rollback) },
      elapsedMs: 0,
      timestamp: Date.now(),
      observations: ["Dry-run preview only; tool was not executed."],
    };
    state.toolResults.push(result);
    state.transcript.push(`TOOL_DRY_RUN ${toolCall.name}: ${JSON.stringify(result.data)}`);
    state.workingMemory.attemptedActions.push(`${toolCall.name} dry-run at iteration ${state.iteration}`);
    return;
  }

  const result = await registry.execute(toolCall.name, toolCall.arguments, {
    sessionId: state.sessionId,
    userId: state.userId,
    signal,
    metadata: { reason: toolCall.reason, iteration: state.iteration },
  });

  state.toolResults.push(result);
  
  const observation = result.ok 
    ? `TOOL_OK ${toolCall.name}: ${JSON.stringify(result.data)}` 
    : `TOOL_ERR ${toolCall.name}: ${result.error}`;
  
  state.transcript.push(observation);
  
  // Update working memory
  state.workingMemory.attemptedActions.push(`${toolCall.name} at iteration ${state.iteration}`);
  if (!result.ok) {
    state.workingMemory.failedActions.push(`${toolCall.name}: ${result.error}`);
    return;
  }

  if (registry.get(toolCall.name)?.rollback) {
    getRollbackStack(state).push({
      skill: toolCall.name,
      arguments: toolCall.arguments,
      data: result.data,
      iteration: state.iteration,
      timestamp: result.timestamp,
    });
  }
}

export async function rollbackExecutedToolCalls(
  registry: SkillRegistry,
  state: AgentExecutionState,
  reason: string,
  signal?: AbortSignal,
): Promise<typeof state.toolResults> {
  const stack = getRollbackStack(state);
  const rollbackResults: typeof state.toolResults = [];

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    const skill = registry.get(entry.skill);
    const startedAt = performance.now();
    if (!skill?.rollback) {
      const skipped = {
        ok: false,
        skill: `${entry.skill}:rollback`,
        error: "Rollback indisponible pour ce skill",
        elapsedMs: 0,
        timestamp: Date.now(),
        observations: [`Rollback skipped after ${reason}.`],
      };
      state.toolResults.push(skipped);
      rollbackResults.push(skipped);
      state.transcript.push(`ROLLBACK_SKIP ${entry.skill}: ${skipped.error}`);
      continue;
    }

    try {
      const data = await skill.rollback(entry.arguments, entry.data, {
        sessionId: state.sessionId,
        userId: state.userId,
        signal,
        reason,
        originalTimestamp: entry.timestamp,
        metadata: { iteration: entry.iteration, rollback: true },
      });
      const result = {
        ok: true,
        skill: `${entry.skill}:rollback`,
        data,
        elapsedMs: performance.now() - startedAt,
        timestamp: Date.now(),
        observations: [`Rollback executed after ${reason}.`],
      };
      state.toolResults.push(result);
      rollbackResults.push(result);
      state.transcript.push(`ROLLBACK_OK ${entry.skill}: ${JSON.stringify(data)}`);
    } catch (error: unknown) {
      const result = {
        ok: false,
        skill: `${entry.skill}:rollback`,
        error: error instanceof Error ? error.message : "Erreur rollback inconnue",
        elapsedMs: performance.now() - startedAt,
        timestamp: Date.now(),
        observations: [`Rollback failed after ${reason}.`],
      };
      state.toolResults.push(result);
      rollbackResults.push(result);
      state.transcript.push(`ROLLBACK_ERR ${entry.skill}: ${result.error}`);
    }
  }

  return rollbackResults;
}

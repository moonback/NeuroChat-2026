import type { SkillRegistry } from "../skills/registry";
import type { AgentExecutionState, ToolCall } from "./types";

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
      data: { preview: true, arguments: toolCall.arguments, reason: toolCall.reason },
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
  }
}

import type { SkillRegistry } from "../skills/registry";
import type { AgentExecutionState, ToolCall } from "./types";

export async function executeToolCall(
  registry: SkillRegistry,
  state: AgentExecutionState,
  toolCall: ToolCall,
  signal?: AbortSignal,
): Promise<void> {
  const result = await registry.execute(toolCall.name, toolCall.arguments, {
    sessionId: state.sessionId,
    userId: state.userId,
    signal,
    metadata: { reason: toolCall.reason, iteration: state.iteration },
  });

  state.toolResults.push(result);
  state.transcript.push(
    result.ok
      ? `TOOL_OK ${toolCall.name}: ${JSON.stringify(result.data)}`
      : `TOOL_ERR ${toolCall.name}: ${result.error}`,
  );
}

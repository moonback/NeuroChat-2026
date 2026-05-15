import { addConversationTurn, getOrCreateCurrentSession } from "../../conversationMemory";
import type { SkillDefinition } from "../types";

export const saveMemoryNoteSkill: SkillDefinition<{ note: string }, { saved: boolean; sessionId: string }> = {
  name: "save_memory_note",
  description: "Persist a short memory note into conversation memory",
  category: "memory",
  parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"], additionalProperties: false },
  permissions: [{ resource: "memory", level: "write" }],
  async execute(params, context) {
    const session = getOrCreateCurrentSession(context.userId);
    await addConversationTurn(session.id, "assistant", `[NOTE] ${params.note}`, context.userId);
    return { saved: true, sessionId: session.id };
  },
};

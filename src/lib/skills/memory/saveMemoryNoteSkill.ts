import { addConversationTurn, getOrCreateCurrentSession } from "../../conversationMemory";
import type { SkillDefinition } from "../types";

export const saveMemoryNoteSkill: SkillDefinition<{ note: string }, { saved: boolean; sessionId: string }> = {
  name: "save_memory_note",
  description: "Persist a short memory note into conversation memory",
  category: "memory",
  parameters: { type: "object", properties: { note: { type: "string" } }, required: ["note"], additionalProperties: false },
  permissions: [{ resource: "memory", level: "write" }],
  async execute(params, context) {
    const session = await getOrCreateCurrentSession(context.userId);
    await addConversationTurn(context.userId, "assistant", `[NOTE] ${params.note}`);
    return { saved: true, sessionId: session.id };
  },
};

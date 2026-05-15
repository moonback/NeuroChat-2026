import type { SkillDefinition } from "../types";

export const summarizeTextSkill: SkillDefinition<{ text: string; maxChars?: number }, { summary: string }> = {
  name: "summarize_text",
  description: "Create a compact deterministic summary of text",
  category: "ai",
  parameters: {
    type: "object",
    properties: { text: { type: "string" }, maxChars: { type: "number" } },
    required: ["text"],
    additionalProperties: false,
  },
  permissions: [{ resource: "ai", level: "execute" }],
  cooldownMs: 150,
  async execute(params) {
    const cap = Math.max(80, Math.min(1000, params.maxChars ?? 240));
    const normalized = params.text.replace(/\s+/g, " ").trim();
    const summary = normalized.length <= cap ? normalized : `${normalized.slice(0, cap - 1)}…`;
    return { summary };
  },
};

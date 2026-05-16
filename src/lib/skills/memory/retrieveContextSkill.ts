import { retrieveRelevantContext } from "../../ragSearch";
import type { SkillDefinition } from "../types";

export const retrieveContextSkill: SkillDefinition<{ query: string }, { contextBlock: string; hasContext: boolean }> = {
  name: "retrieve_context",
  description: "Retrieve relevant long-term memory snippets for a user query",
  category: "memory",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
  permissions: [{ resource: "memory", level: "read" }],
  cooldownMs: 300,
  async execute(params, context) {
    const rag = await retrieveRelevantContext(params.query, context.userId, null, 6, 0.62);
    return { contextBlock: rag.contextBlock, hasContext: rag.hasContext };
  },
};

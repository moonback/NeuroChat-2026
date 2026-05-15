import type { SkillDefinition, SkillContext } from "./types";

export interface DelegateTaskParams {
  agentId: string;
  task: string;
  contextData?: string;
}

export const delegateTaskSkill: SkillDefinition<DelegateTaskParams, { finalAnswer: string, toolResultsCount: number }> = {
  name: "delegateTask",
  description: "Délègue une tâche complexe à un sous-agent spécialisé.",
  category: "ai",
  riskLevel: "low",
  parameters: {
    type: "object",
    properties: {
      agentId: { type: "string", description: "ID de l'agent à appeler (ex: research_agent, file_agent)" },
      task: { type: "string", description: "Description précise de la tâche à accomplir" },
      contextData: { type: "string", description: "Données de contexte optionnelles à passer au sous-agent" },
    },
    required: ["agentId", "task"],
  },
  permissions: [],
  execute: async (params, context) => {
    // Le contexte DOIT contenir la fonction runSubAgent injectée par le Superviseur
    const runSubAgent = context.metadata?.runSubAgent as ((
      agentId: string, 
      input: string, 
      sessionId: string, 
      userId: string
    ) => Promise<{ answer: string, toolResultsCount: number }>) | undefined;

    if (!runSubAgent) {
      throw new Error("L'orchestrateur parent n'a pas fourni de fonction runSubAgent dans le contexte.");
    }

    const inputMsg = params.contextData 
      ? `Tâche: ${params.task}\n\nContexte additionnel:\n${params.contextData}`
      : params.task;

    console.log(`[DelegateTask] Délégation à ${params.agentId}: ${params.task}`);
    
    // On exécute le sous-agent
    const result = await runSubAgent(params.agentId, inputMsg, context.sessionId, context.userId);
    
    return {
      finalAnswer: result.answer,
      toolResultsCount: result.toolResultsCount
    };
  },
};

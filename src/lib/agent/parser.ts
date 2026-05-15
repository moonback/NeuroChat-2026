import type { AgentStep } from "./types";

const STEP_PATTERN = /```json\s*([\s\S]*?)\s*```/i;

export function parseAgentStep(raw: string): AgentStep {
  const payload = raw.match(STEP_PATTERN)?.[1] ?? raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Réponse modèle invalide: JSON introuvable");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Réponse modèle invalide: objet attendu");

  const step = parsed as Partial<AgentStep>;
  if (typeof step.thought !== "string" || step.thought.trim().length === 0) {
    throw new Error("Réponse modèle invalide: thought manquant");
  }

  if (step.finalAnswer !== undefined && typeof step.finalAnswer !== "string") {
    throw new Error("Réponse modèle invalide: finalAnswer doit être un string");
  }

  if (step.toolCall !== undefined) {
    if (!step.toolCall.name || typeof step.toolCall.name !== "string") throw new Error("toolCall.name manquant");
    if (!step.toolCall.arguments || typeof step.toolCall.arguments !== "object" || Array.isArray(step.toolCall.arguments)) {
      throw new Error("toolCall.arguments doit être un objet");
    }
  }

  if (step.finalAnswer && step.toolCall) throw new Error("Réponse modèle invalide: toolCall et finalAnswer sont mutuellement exclusifs");

  return { thought: step.thought, toolCall: step.toolCall, finalAnswer: step.finalAnswer };
}

import type { AgentStep } from "./types";

const STEP_PATTERN = /```json\s*([\s\S]*?)\s*```/i;

export function parseAgentStep(raw: string): AgentStep {
  const match = raw.match(STEP_PATTERN);
  const payload = match?.[1] ?? raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("Réponse modèle invalide: JSON introuvable");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Réponse modèle invalide: objet attendu");
  }

  const step = parsed as Partial<AgentStep>;
  if (!step.thought || typeof step.thought !== "string") {
    throw new Error("Réponse modèle invalide: thought manquant");
  }

  if (step.finalAnswer && typeof step.finalAnswer !== "string") {
    throw new Error("Réponse modèle invalide: finalAnswer doit être un string");
  }

  return {
    thought: step.thought,
    toolCall: step.toolCall,
    finalAnswer: step.finalAnswer,
  };
}

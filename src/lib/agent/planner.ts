import type { SkillDefinition } from "../skills/types";
import type { AgentExecutionState } from "./types";

export function buildPlannerPrompt(state: AgentExecutionState, skills: SkillDefinition[]): string {
  const skillLines = skills.map((s) => `- ${s.name}: ${s.description} | catégorie=${s.category}`).join("\n");
  const transcript = state.transcript.slice(-8).join("\n");

  return [
    "Tu es un agent autonome orienté tools.",
    "Réponds UNIQUEMENT en JSON avec shape:",
    '{"thought":"...","toolCall":{"name":"...","arguments":{}},"finalAnswer":"..."}',
    "Soit toolCall, soit finalAnswer, jamais les deux.",
    "Tools disponibles:",
    skillLines,
    `Question utilisateur: ${state.input}`,
    "Historique récent:",
    transcript || "(vide)",
  ].join("\n");
}

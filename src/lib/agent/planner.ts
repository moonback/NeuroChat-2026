import type { SkillDefinition } from "../skills/types";
import type { AgentExecutionState } from "./types";

function formatSkill(skill: SkillDefinition): string {
  const required = skill.parameters.required?.join(", ") || "aucun";
  const confirmation = skill.requiresConfirmation ? "oui" : "non";
  const cooldown = typeof skill.cooldownMs === "number" ? `${skill.cooldownMs}ms` : "none";
  return `- ${skill.name}: ${skill.description} | catégorie=${skill.category} | required=${required} | confirmation=${confirmation} | cooldown=${cooldown}`;
}

export function buildPlannerPrompt(state: AgentExecutionState, skills: SkillDefinition[]): string {
  const skillLines = skills.map(formatSkill).join("\n");
  const transcript = state.transcript.slice(-8).join("\n");

  return [
    "Tu es un agent autonome orienté tools.",
    "Réponds UNIQUEMENT en JSON strict.",
    "Format attendu:",
    '{"thought":"...","toolCall":{"name":"...","arguments":{}},"finalAnswer":"..."}',
    "Règles:",
    "1) Soit toolCall, soit finalAnswer, jamais les deux.",
    "2) toolCall.arguments doit respecter les paramètres requis.",
    "3) Si un tool échoue, ajuste la stratégie.",
    "Tools disponibles:",
    skillLines || "(aucun)",
    `Question utilisateur: ${state.input}`,
    "Historique récent:",
    transcript || "(vide)",
  ].join("\n");
}

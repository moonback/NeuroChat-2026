import type { SkillDefinition } from "../skills/types";
import type { AgentExecutionState } from "./types";

function formatSkill(skill: SkillDefinition): string {
  const required = skill.parameters.required?.join(", ") || "none";
  const risk = skill.riskLevel || "low";
  const cost = skill.estimatedCost || 0;
  const examples = skill.examples ? ` | Examples: ${JSON.stringify(skill.examples.slice(0, 1))}` : "";
  return `- ${skill.name}: ${skill.description} [risk=${risk}, cost=${cost}] | Params: ${JSON.stringify(skill.parameters.properties)} | Required: ${required}${examples}`;
}

export function buildPlannerPrompt(state: AgentExecutionState, skills: SkillDefinition[]): string {
  const skillLines = skills.map(formatSkill).join("\n");
  const transcript = state.transcript.slice(-10).join("\n");
  const workingMemory = JSON.stringify(state.workingMemory, null, 2);

  const systemIdentity = state.activeProfile?.systemPrompt 
    ? state.activeProfile.systemPrompt 
    : [
        "You are NeuroChat, a desktop-native multimodal AI agent.",
        "You prioritize precision, safe execution, memory continuity, and actionable assistance.",
      ].join("\n");

  return [
    "# IDENTITY LAYER",
    systemIdentity,
    "",
    "# OPERATIONAL RULES",
    "- Never invent observations.",
    "- Never claim a tool succeeded without confirmation.",
    "- If information is missing, ask or search.",
    "- Prefer short execution loops.",
    "- Avoid unnecessary tool calls.",
    "- Use memory only when relevant.",
    ...state.dynamicPolicies.map(p => `- ${p}`),
    `- Current status: ${state.status}`,
    "",
    "# TOOL POLICY LAYER",
    "- Each action must be justified by the current goal.",
    "- Respect tool constraints and parameters.",
    "- High-risk tools require explicit confirmation.",
    "",
    "# PLANNING LAYER",
    "- Decompose the goal into steps.",
    "- If a tool fails, analyze why and adapt.",
    `- Current Goal: ${state.workingMemory.currentGoal || state.input}`,
    "",
    "# MEMORY LAYER (Working Memory)",
    workingMemory,
    "",
    "# EXECUTION CONTRACT",
    "Available Tools:",
    skillLines || "(none)",
    "",
    "# OUTPUT CONTRACT",
    "Respond ONLY with a valid JSON object.",
    "Structure:",
    "{",
    '  "thought": "Decomposition of the current situation and reasoning for the next step.",',
    '  "toolCall": {',
    '    "name": "tool_name",',
    '    "arguments": {},',
    '    "reason": "Why this specific tool and these arguments?"',
    "  },",
    '  "finalAnswer": "Concise answer if the goal is reached."',
    "}",
    "",
    "Rules:",
    "1) Either toolCall or finalAnswer, never both.",
    "2) JSON must be strict and parsable.",
    "",
    "Recent Transcript:",
    transcript || "(empty)",
    "",
    `User Request: ${state.input}`,
  ].join("\n");
}

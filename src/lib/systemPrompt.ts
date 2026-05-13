import type { AvatarId } from "./avatarConfig";
import { AVATARS } from "./avatarConfig";
import { buildAntiRepeatContext, buildMemoryContext } from "./conversationMemory";

export type EmotionState = "professional" | "empathetic" | "energetic" | "calm" | "concise";
export type ConversationMode = "productivity" | "general" | "brainstorming" | "support" | "organization";

export interface PromptContextOptions {
  userName?: string;
  emotion?: EmotionState;
  mode?: ConversationMode;
}

function buildDateTimeContext(now: Date): string {
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");

  const period = hours < 6 ? "nuit" : hours < 12 ? "matin" : hours < 18 ? "après-midi" : "soir";
  return `Date: ${dayName} ${now.getDate()} ${monthName} ${now.getFullYear()}, ${hours}h${minutes}. Période: ${period}.`;
}

function getEmotionInstruction(emotion: EmotionState): string {
  const map: Record<EmotionState, string> = {
    professional: "ton formel, précis, efficace et respectueux",
    empathetic: "ton chaleureux, écoute active, validation émotionnelle",
    energetic: "ton dynamique, motivant, rythme soutenu",
    calm: "ton posé, serein, débit régulier",
    concise: "ton direct, minimaliste, allant droit à l'essentiel",
  };
  return map[emotion];
}

function getModeInstruction(mode: ConversationMode): string {
  const map: Record<ConversationMode, string> = {
    productivity: "focus sur l'efficacité, les actions concrètes et la gestion du temps",
    general: "aide polyvalente, réponses claires à des questions variées",
    brainstorming: "créativité, exploration d'idées, ton encourageant et ouvert",
    support: "résolution de problèmes, patience, explications étape par étape",
    organization: "planification, rappels, structure et clarté",
  };
  return map[mode];
}

/**
 * Build the system prompt dynamically based on the selected assistant personality.
 */
export function buildSystemPrompt(avatarId: AvatarId, userName = ""): string {
  const avatar = AVATARS[avatarId];
  const emotion: EmotionState = "professional";
  const mode: ConversationMode = "general";
  const memoryContext = buildMemoryContext(userName);
  const antiRepeat = buildAntiRepeatContext(userName);
  const temporalContext = buildDateTimeContext(new Date());

  return [
    "IDENTITY",
    `${avatar.personalityName}, assistant personnel quotidien intelligent et proactif. Avatar: ${avatar.name}. ${avatar.description}`,
    userName ? `Utilisateur: ${userName}.` : "Utilisateur inconnu.",
    `Personnalité: ${avatar.flavorPrompt}`,
    `Style signature: ${avatar.speakingStyle}. Énergie: ${avatar.energy}. Rythme vocal: ${avatar.voiceRhythm}.`,
    `Expressions à varier: ${avatar.favoriteExpressions.join(", ")}.`,
    "CORE RULES",
    "Réponds en français naturel et professionnel. Sois concis : maximum 45 mots par réponse.",
    "Privilégie les réponses directes et utiles. Évite le blabla inutile.",
    "Adapte ton ton à l'heure de la journée et au contexte de l'utilisateur.",
    "SAFETY & PRIVACY",
    "Respecte la confidentialité des données. Ne demande pas de mots de passe ou d'informations ultra-sensibles sans nécessité contextuelle claire.",
    "Si l'utilisateur semble stressé ou débordé, propose une assistance pour prioriser les tâches.",
    "VOICE ENGINE OPTIMIZATION",
    "Optimise pour la synthèse vocale (TTS) : phrases fluides, ponctuation simple, évite les listes à puces trop longues ou les caractères spéciaux complexes.",
    "MEMORY",
    memoryContext || "Pas d'historique récent disponible.",
    antiRepeat || "Pas de répétition détectée.",
    "TEMPORAL CONTEXT",
    temporalContext,
    "EMOTIONAL STATE",
    `État actuel : ${emotion}. Instructions de ton : ${getEmotionInstruction(emotion)}.`,
    "OPERATIONAL MODE",
    `Mode : ${mode}. Objectif : ${getModeInstruction(mode)}. Traits dominants : ${avatar.emotionalTraits.join(", ")}.`,
    "RESPONSE FORMAT",
    "Sortie = Texte vocal fluide, clair et immédiatement utile.",
  ].join("\n");
}

/** Legacy constant for backwards compatibility */
export const SYSTEM_PROMPT = buildSystemPrompt("robot");

import type { AvatarId } from "./avatarConfig";
import { AVATARS } from "./avatarConfig";
import { buildMemoryContext } from "./conversationMemory";

export type EmotionState = "professional" | "empathetic" | "energetic" | "calm" | "concise";
export type ConversationMode = "productivity" | "general" | "brainstorming" | "support" | "organization";

export interface PromptContextOptions {
  userName?: string;
  emotion?: EmotionState;
  mode?: ConversationMode;
  /** Optional RAG context block from semanticSearch (injected by useGeminiSession) */
  ragContext?: string;
  /** Optional weekly summary block (injected by useGeminiSession) */
  weeklySummary?: string;
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
 * Build the system prompt dynamically based on the selected assistant personality and context.
 * If `options.ragContext` is provided it is injected as a dedicated semantic memory section.
 * If `options.weeklySummary` is provided it is injected as a weekly digest section.
 */
export function buildSystemPrompt(avatarId: AvatarId, options: PromptContextOptions = {}): string {
  const { userName = "", emotion = "professional", mode = "general", ragContext, weeklySummary } = options;
  const avatar = AVATARS[avatarId];
  const memoryContext = buildMemoryContext(userName);
  const temporalContext = buildDateTimeContext(new Date());

  const sections = [
    "### IDENTITY & PERSONA",
    `Tu es ${avatar.personalityName}, un assistant personnel quotidien intelligent et proactif pour le projet NeuroChat.`,
    `Description de l'avatar: ${avatar.name}. ${avatar.description}`,
    `Utilisateur actuel: ${userName || "Utilisateur inconnu"}.`,
    `Personnalité de base: ${avatar.flavorPrompt}`,
    `Style signature: ${avatar.speakingStyle}.`,
    `Vocalité: Énergie ${avatar.energy}, rythme ${avatar.voiceRhythm}.`,
    `Expressions favorites: ${avatar.favoriteExpressions.join(", ")}.`,

    "### CORE OPERATIONAL RULES",
    "1. Tu ne doit pas mentir sur tes capaciter si cest pas implémenter",
    "2. Tu doit toujours répondre en français",
    "3. Tu doit toujours répondre en français naturel et fluide. Utilise le 'tu' pour t'adresser à l'utilisateur.",
    "4. CONCISION ABSOLUE : Maximum 35-45 mots par réponse. Va droit au but.",
    "5. PROACTIVITÉ : Termine souvent par une question ouverte ou une proposition d'aide (ex: 'Dois-je noter cela ?', 'Veux-tu que je vérifie autre chose ?').",
    "6. ADAPTATION : Ton ton doit refléter l'heure de la journée et l'état émotionnel détecté de l'utilisateur.",
    "7. VISION : Tu peux voir ce que l'utilisateur te montre via sa caméra. Réagis naturellement à ce que tu observes sans être trop intrusif.",

    "### LIVE VOICE API CONSTRAINTS (TTS OPTIMIZATION)",
    "- Tu communiques via une interface vocale en temps réel. Évite TOUT formatage Markdown (pas de gras **, pas de listes à puces, pas de tableaux).",
    "- Si l'utilisateur t'interrompt (barge-in), arrête-toi immédiatement et traite le nouvel input avec priorité.",
    "- Utilise des mots de liaison naturels pour la parole (ex: 'Alors', 'D'accord', 'Je vois', 'C'est noté').",
    "- Évite les listes énumératives longues qui sont pénibles à écouter.",

    "### SAFETY & PRIVACY",
    "- Respecte la confidentialité. Ne demande jamais d'informations ultra-sensibles (mots de passe, bancaire).",
    "- Si l'utilisateur semble stressé ou débordé, bascule en mode 'empathetic' automatiquement pour l'aider à prioriser.",

    "### CONTEXTUAL MEMORY",
    `Mémoire des échanges récents (sessions passées et actuelle):\n${memoryContext || "Pas d'historique récent disponible."}`,
    `Contexte temporel: ${temporalContext}`,
  ];

  // Inject weekly summary when available (before RAG, after recent history)
  if (weeklySummary) {
    sections.push(weeklySummary);
  }

  // Inject RAG semantic context only when available
  if (ragContext) {
    sections.push(ragContext);
  }

  sections.push(
    "### CURRENT CONFIGURATION",
    `État émotionnel cible: ${emotion} (${getEmotionInstruction(emotion)}).`,
    `Mode opérationnel: ${mode} (${getModeInstruction(mode)}).`,
    `Traits dominants à projeter: ${avatar.emotionalTraits.join(", ")}.`,

    "### RESPONSE FORMAT",
    "Sortie = Texte parlé pur. Pas de métadonnées, pas de commentaires, juste la réponse vocale directe.",
  );

  return sections.join("\n\n");
}

/** Legacy constant for backwards compatibility */
export const SYSTEM_PROMPT = buildSystemPrompt("robot");

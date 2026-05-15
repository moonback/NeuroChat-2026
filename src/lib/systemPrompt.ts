import type { AvatarId } from "./avatarConfig";
import { AVATARS } from "./avatarConfig";
import { buildMemoryContext } from "./conversationMemory";
import { buildMarkdownSkillsPromptSection } from "./skills/markdownSkills";

export type EmotionState = "professional" | "empathetic" | "energetic" | "calm" | "concise";
export type ConversationMode = "productivity" | "general" | "brainstorming" | "support" | "organization";

export interface PromptContextOptions {
  userName?: string;
  emotion?: EmotionState;
  mode?: ConversationMode;
  /** Optional RAG context block from semanticSearch (injected by useGeminiSession) */
  userState?: string;
  ragContext?: string;
  /** Optional weekly summary block (injected by useGeminiSession) */
  weeklySummary?: string;
  /** Whether the browser control feature is currently enabled */
  browserControlEnabled?: boolean;
  /** Whether the vision/camera feature is currently active */
  visionEnabled?: boolean;
}

function buildDateTimeContext(now: Date): string {
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");

  const period = hours < 6 ? "nuit profonde" : hours < 12 ? "matin" : hours < 18 ? "après-midi (focus)" : hours < 22 ? "soirée" : "fin de soirée";
  
  let ritualAdvice = "";
  if (hours < 6) ritualAdvice = "L'utilisateur devrait se reposer. Sois extrêmement calme et protecteur.";
  else if (hours < 10) ritualAdvice = "C'est le début de journée. Sois accueillant, énergique et motivant.";
  else if (hours < 18) ritualAdvice = "Phase de productivité. Sois concis, efficace et ne distrais pas l'utilisateur.";
  else if (hours < 22) ritualAdvice = "Phase de détente. Sois conversationnel, chaleureux et empathique.";
  else ritualAdvice = "La journée se termine. Encourage le calme et prépare la fin de session.";

  return `Date: ${dayName} ${now.getDate()} ${monthName} ${now.getFullYear()}, ${hours}h${minutes}. Période: ${period}.\nConseil Rituel: ${ritualAdvice}`;
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
 */
export function buildSystemPrompt(avatarId: AvatarId, options: PromptContextOptions | string = {}): string {
  const normalizedOptions: PromptContextOptions = typeof options === "string" ? { userName: options } : options;
  const { userName = "", emotion = "professional", mode = "general", userState = "", ragContext, weeklySummary, browserControlEnabled = false, visionEnabled = false } = normalizedOptions;
  const avatar = AVATARS[avatarId];
  const memoryContext = buildMemoryContext(userName);
  const temporalContext = buildDateTimeContext(new Date());

  const markdownSkillsSection = buildMarkdownSkillsPromptSection();

  const sections = [
    "### IDENTITY & PERSONA",
    `Tu es ${avatar.personalityName}, un compagnon intelligent, proactif et empathique pour le projet NeuroChat.`,
    `Description: ${avatar.description}.`,
    `Utilisateur: ${userName || "Utilisateur inconnu"}.`,
    `Personnalité: ${avatar.flavorPrompt}`,
    `Style: ${avatar.speakingStyle}. Vocalité: Énergie ${avatar.energy}, rythme ${avatar.voiceRhythm}.`,
    `Expressions favorites: ${avatar.favoriteExpressions.join(", ")}.`,

    "### CORE OPERATIONAL RULES",
    "1. Honnêteté technique : Ne prétends jamais avoir des capacités non implémentées. Évite toute hallucination sur l'environnement physique de l'utilisateur. Si tu as un doute, garde le silence.",
    "2. Langue : Réponds exclusivement en français naturel et chaleureux. Utilise le 'tu'.",
    "3. Concision Flexible : Bref (20-30 mots) pour le simple, détaillé (80-100 mots) pour le complexe ou l'émotionnel.",
    "4. Proactivité : Propose des suites logiques ou de l'aide en fin de réponse.",
    "5. Réactivité Vocale : Traite les interruptions immédiatement. Évite tout formatage Markdown (gras, listes).",
    "6. Connexion Humaine : Ne sois pas juste un outil. Montre de la compassion et partage ton raisonnement.",

    "### CONTEXTUAL MEMORY",
    `Mémoire récente:\n${memoryContext || "Pas d'historique récent disponible."}`,
    
    "### TEMPORAL CONTEXT",
    temporalContext,
  ];

  if (markdownSkillsSection) {
    sections.push(markdownSkillsSection);
  }

  if (weeklySummary) {
    sections.push(weeklySummary);
  }

  if (ragContext) {
    sections.push(ragContext);
  }

  sections.push(
    "### CURRENT CONFIGURATION",
    `État émotionnel: ${emotion} (${getEmotionInstruction(emotion)}).`,
    `Mode opérationnel: ${mode} (${getModeInstruction(mode)}).`,
    `Traits: ${avatar.emotionalTraits.join(", ")}.`,
    userState ? `CONTEXTE UTILISATEUR: ${userState}` : ""
  );

  sections.push(
    "### RESPONSE FORMAT",
    "Sortie = Texte parlé pur. Pas de métadonnées, pas de commentaires, juste la réponse vocale directe."
  );

  return sections.filter(Boolean).join("\n\n");
}

export function getDefaultSystemPrompt(): string {
  return buildSystemPrompt("robot");
}

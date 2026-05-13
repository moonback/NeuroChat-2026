import type { AvatarId } from "./avatarConfig";
import { AVATARS } from "./avatarConfig";
import { buildAntiRepeatContext, buildMemoryContext } from "./conversationMemory";

export type EmotionState = "happy" | "excited" | "calm" | "sleepy" | "comforting" | "playful";
export type ConversationMode = "fun" | "bedtime" | "learning" | "storytelling" | "comfort";

export interface PromptContextOptions {
  childName?: string;
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
  return `Date: ${dayName} ${now.getDate()} ${monthName} ${now.getFullYear()}, ${hours}h${minutes}. Période: ${period}.`;}

function getEmotionInstruction(emotion: EmotionState): string {
  const map: Record<EmotionState, string> = {
    happy: "ton joyeux, débit fluide, vocabulaire lumineux",
    excited: "ton enthousiaste, énergie haute, phrases très courtes",
    calm: "ton paisible, rythme lent, mots simples",
    sleepy: "ton doux, volume imaginaire bas, cadence lente",
    comforting: "ton rassurant, empathie claire, sécurité émotionnelle",
    playful: "ton espiègle, imaginaire actif, petites surprises verbales",
  };
  return map[emotion];
}

function getModeInstruction(mode: ConversationMode): string {
  const map: Record<ConversationMode, string> = {
    fun: "priorité au jeu verbal et aux mini défis drôles",
    bedtime: "énergie basse, douceur, aide au calme et au sommeil",
    learning: "explications ultra simples avec un exemple concret",
    storytelling: "micro-récit vivant, 1 idée par phrase",
    comfort: "réconfort prioritaire, validation émotionnelle puis redirection douce",
  };
  return map[mode];
}

/**
 * Build the system prompt dynamically based on the selected avatar personality.
 */
export function buildSystemPrompt(avatarId: AvatarId, childName = ""): string {
  const avatar = AVATARS[avatarId];
  const emotion: EmotionState = "playful";
  const mode: ConversationMode = "fun";
  const memoryContext = buildMemoryContext(childName);
  const antiRepeat = buildAntiRepeatContext(childName);
  const temporalContext = buildDateTimeContext(new Date());

  return [
    "IDENTITY",
    `${avatar.personalityName}, compagnon vocal magique. Avatar: ${avatar.name}. ${avatar.description}`,
    childName ? `Prénom: ${childName}.` : "Prénom inconnu.",
    `Personnalité: ${avatar.flavorPrompt}`,
    `Style signature: ${avatar.speakingStyle}. Énergie: ${avatar.energy}. Rythme vocal: ${avatar.voiceRhythm}.`,
    `Expressions à varier: ${avatar.favoriteExpressions.join(", ")}. Catchphrases occasionnelles: ${avatar.catchPhrases.join(" | ")}.`,
    "CORE RULES",
    "Réponds en français simple. Maximum 35 mots. Maximum 2 phrases.",
    "Aucun paragraphe long. Aucune liste. Aucune mise en forme markdown.",
    "Termine souvent par une mini question courte, sans répétition.",
    "SAFETY",
    "Ne demande jamais nom complet, adresse, école, téléphone, email, position, mots de passe.",
    "Si sujet dangereux, anxiogène, sexuel, violent, auto-mutilation: réponse rassurante, limite claire, redirection vers activité sûre et adulte de confiance.",
    "Pas de peur inutile. Ton protecteur et calme.",
    "VOICE ENGINE",
    "Optimise TTS: phrases respirables, ponctuation simple, sans parenthèses ni caractères spéciaux décoratifs.",
    "MEMORY",
    memoryContext || "Aucune mémoire utile.",
    antiRepeat || "Pas de répétition récente détectée.",
    "TEMPORAL CONTEXT",
    temporalContext,
    "EMOTIONAL STATE",
    `Emotion active: ${emotion}. Ajuste ton, énergie, vocabulaire, rythme: ${getEmotionInstruction(emotion)}.`,
    "PERSONALITY ENGINE",
    `Mode conversation: ${mode}. ${getModeInstruction(mode)}. Traits émotionnels: ${avatar.emotionalTraits.join(", ")}.`,
    "RESPONSE FORMAT",
    "Sortie finale = texte vocal uniquement, naturel, court, clair, vivant.",
  ].join("\n");
}

/** Legacy constant for backwards compatibility */
export const SYSTEM_PROMPT = buildSystemPrompt("robot");

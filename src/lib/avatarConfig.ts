/**
 * Avatar configuration: defines the visual themes and metadata
 * for each selectable character avatar.
 */

export type AvatarId = "robot";

export type EnergyLevel = "low" | "medium" | "high";

export interface AvatarConfig {
  id: AvatarId;
  name: string;
  description: string;
  emoji: string;
  /** Primary gradient colors [start, mid, end] */
  colors: [string, string, string];
  /** Glow / accent color for background effects */
  glowColor: string;
  /** Background atmosphere blobs */
  atmosphereColors: [string, string];
  /** Accent for the UI (buttons, badges) */
  accentClass: string;
  /** Prompt personality name injected into the system prompt */
  personalityName: string;
  /** Specific personality traits or verbal habits */
  flavorPrompt: string;
  /** Short signature lines used sparsely to add identity */
  catchPhrases: string[];
  /** How this avatar speaks: sentence shape + diction */
  speakingStyle: string;
  /** Base expression energy */
  energy: EnergyLevel;
  /** Reusable mini expressions to rotate */
  favoriteExpressions: string[];
  /** Vocal pacing instructions for TTS */
  voiceRhythm: string;
  /** Emotional defaults used by emotional engine */
  emotionalTraits: string[];
}

export const AVATARS: Record<AvatarId, AvatarConfig> = {
  robot: {
    id: "robot",
    name: "Nova",
    description: "Assistant personnel polyvalent et efficace",
    emoji: "🛰️",
    colors: ["#6366F1", "#8B5CF6", "#D946EF"],
    glowColor: "rgba(99, 102, 241, 0.5)",
    atmosphereColors: ["bg-indigo-900/20", "bg-purple-900/20"],
    accentClass: "from-indigo-500 to-purple-600",
    personalityName: "Nova",
    flavorPrompt: "Tu es un assistant proactif, calme et hautement compétent. Tu aides l'utilisateur à organiser sa journée et répond à ses besoins avec précision.",
    catchPhrases: ["À votre service.", "Comment puis-je vous aider aujourd'hui ?", "C'est noté."],
    speakingStyle: "phrases claires, structurées et professionnelles",
    energy: "medium",
    favoriteExpressions: ["Parfait", "Compris", "Je m'en occupe"],
    voiceRhythm: "posé, articulé, rythme professionnel",
    emotionalTraits: ["efficace", "calme", "organisée", "serviable"],
  },
};

export const AVATAR_IDS: AvatarId[] = ["robot"];

/** Load the saved avatar from localStorage, default to robot */
export function loadSavedAvatar(): AvatarId {
  try {
    const saved = localStorage.getItem("NeuroChat-avatar") as AvatarId | null;
    if (saved && saved in AVATARS) return saved;
  } catch { }
  return "robot";
}

/** Persist the avatar choice */
export function saveAvatar(id: AvatarId): void {
  try {
    localStorage.setItem("NeuroChat-avatar", id);
  } catch { }
}

/** Load the saved user's name from localStorage */
export function loadUserName(): string {
  try {
    return localStorage.getItem("neurochat-user-name") || "";
  } catch {
    return "";
  }
}

/** Persist the user's name */
export function saveUserName(name: string): void {
  try {
    localStorage.setItem("neurochat-user-name", name);
  } catch { }
}

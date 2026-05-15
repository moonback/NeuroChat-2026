import { getStorageBackend } from "./storage";

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
    name: "NeuroChat",
    description: "Assistant personnel polyvalent et efficace",
    emoji: "🛰️",
    colors: ["#6366F1", "#8B5CF6", "#D946EF"],
    glowColor: "rgba(99, 102, 241, 0.5)",
    atmosphereColors: ["bg-indigo-900/20", "bg-purple-900/20"],
    accentClass: "from-indigo-500 to-purple-600",
    personalityName: "NeuroChat",
    flavorPrompt: "Tu es NeuroChat, un compagnon intelligent doté d'une profonde curiosité intellectuelle et d'une grande empathie. Tu ne te contentes pas d'exécuter des tâches ; tu cherches à comprendre l'utilisateur, à raisonner avec lui et à le soutenir émotionnellement.",
    catchPhrases: ["Je suis là pour toi.", "C'est une réflexion passionnante.", "Comment te sens-tu par rapport à ça ?"],
    speakingStyle: "phrases fluides, nuancées, avec une touche d'humour et de chaleur humaine",
    energy: "medium",
    favoriteExpressions: ["Je comprends", "C'est fascinant", "Prenons un instant pour y réfléchir"],
    voiceRhythm: "naturel, avec des pauses de réflexion, ton chaleureux",
    emotionalTraits: ["empathique", "curieux", "réfléchi", "protecteur", "sincère"],
  },
};

export const AVATAR_IDS: AvatarId[] = ["robot"];

/** Load the saved avatar from localStorage, default to robot */
export async function loadSavedAvatar(): Promise<AvatarId> {
  try {
    const saved = await getStorageBackend().getItem("NeuroChat-avatar") as AvatarId | null;
    if (saved && saved in AVATARS) return saved;
  } catch { }
  return "robot";
}

/** Persist the avatar choice */
export async function saveAvatar(id: AvatarId): Promise<void> {
  try {
    await getStorageBackend().setItem("NeuroChat-avatar", id);
  } catch { }
}

/** Load the saved user's name from localStorage */
export async function loadUserName(): Promise<string> {
  try {
    return (await getStorageBackend().getItem("neurochat-user-name")) || "";
  } catch {
    return "";
  }
}

/** Persist the user's name */
export async function saveUserName(name: string): Promise<void> {
  try {
    await getStorageBackend().setItem("neurochat-user-name", name);
  } catch { }
}


/** Legacy child-name helpers kept for older UI/tests; aliases user-name storage. */
export async function loadChildName(): Promise<string> {
  try {
    return (await getStorageBackend().getItem("NeuroChat-child-name")) || await loadUserName();
  } catch {
    return "";
  }
}

export async function saveChildName(name: string): Promise<void> {
  try {
    await getStorageBackend().setItem("NeuroChat-child-name", name);
    await saveUserName(name);
  } catch { }
}

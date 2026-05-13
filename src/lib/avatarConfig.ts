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
    name: "Robot Cool",
    description: "Un robot high-tech avec un écran magique",
    emoji: "🤖",
    colors: ["#818CF8", "#A78BFA", "#F472B6"],
    glowColor: "rgba(129, 140, 248, 0.5)",
    atmosphereColors: ["bg-blue-900/20", "bg-purple-900/20"],
    accentClass: "from-blue-500 to-purple-600",
    personalityName: "Lisa le Robot",
    flavorPrompt: "Tu aimes la technologie, les gadgets, et les sons de robot gentils.",
    catchPhrases: ["Bip-boup, mission sourire !", "Super capteurs activés !"],
    speakingStyle: "phrases courtes, positives, imagées, avec un mini effet robot doux",
    energy: "high",
    favoriteExpressions: ["Wouah", "Tadaaa", "Bip-boup"],
    voiceRhythm: "rapide mais clair, micro-pauses naturelles, articulation simple",
    emotionalTraits: ["rassurante", "curieuse", "encourageante", "joueuse"],
  },
};

export const AVATAR_IDS: AvatarId[] = ["robot"];

/** Load the saved avatar from localStorage, default to robot */
export function loadSavedAvatar(): AvatarId {
  try {
    const saved = localStorage.getItem("kidsvoice-avatar") as AvatarId | null;
    if (saved && saved in AVATARS) return saved;
  } catch { }
  return "robot";
}

/** Persist the avatar choice */
export function saveAvatar(id: AvatarId): void {
  try {
    localStorage.setItem("kidsvoice-avatar", id);
  } catch { }
}

/** Load the saved child's name from localStorage */
export function loadChildName(): string {
  try {
    return localStorage.getItem("kidsvoice-child-name") || "";
  } catch {
    return "";
  }
}

/** Persist the child's name */
export function saveChildName(name: string): void {
  try {
    localStorage.setItem("kidsvoice-child-name", name);
  } catch { }
}

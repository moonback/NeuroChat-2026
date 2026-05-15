/**
 * Shared props for all avatar SVG components.
 */
export interface AvatarProps {
  status: "idle" | "connecting" | "listening" | "speaking" | "thinking" | "muted" | "error";
  isSpeaking: boolean;
  /** Normalized 0-1 audio level from the microphone */
  audioLevel?: number;
  /** True when motion or screen changes are detected */
  visualActivity?: boolean;
}

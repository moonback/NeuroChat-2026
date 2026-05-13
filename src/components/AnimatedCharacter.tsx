import { motion } from "motion/react";
import type { AvatarId } from "../lib/avatarConfig";
import { AVATARS } from "../lib/avatarConfig";
import { RobotAvatar } from "./avatars/RobotAvatar";

interface Props {
  status: "idle" | "connecting" | "listening";
  isSpeaking: boolean;
  avatarId?: AvatarId;
  /** Normalized 0-1 audio level from the microphone */
  audioLevel?: number;
  /** Whether usage is currently restricted */
  isRestricted?: boolean;
}

export function AnimatedCharacter({ status, isSpeaking, avatarId = "robot", audioLevel = 0, isRestricted = false }: Props) {
  const avatar = AVATARS[avatarId];

  // Body bounce — intensity driven by audioLevel when listening
  const bounceIntensity = status === "listening" ? Math.max(5, audioLevel * 20) : 0;

  const bodyY = isSpeaking
    ? [0, -10, 0]
    : status === "listening"
      ? [0, -bounceIntensity, 0]
      : status === "connecting"
        ? [0, -2, 0]
        : [0, 5, 0];

  const bodyTransition = isSpeaking
    ? { duration: 0.3, repeat: Infinity }
    : status === "listening"
      ? { duration: Math.max(0.3, 2 - audioLevel * 1.5), repeat: Infinity, ease: "easeInOut" as const }
      : status === "connecting"
        ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const }
        : { duration: 3, repeat: Infinity, ease: "easeInOut" as const };

  /** Render the appropriate avatar SVG */
  function renderAvatar() {
    const props = { status: isRestricted ? ("connecting" as const) : status, isSpeaking, audioLevel };
    return <RobotAvatar {...props} />;
  }

  // Glow scale reacts to audio level when listening
  const glowScale = isSpeaking
    ? [1, 1.2, 1]
    : status === "listening"
      ? 1 + audioLevel * 0.4
      : 1;

  const glowOpacity = isSpeaking
    ? 0.8
    : status === "listening"
      ? 0.3 + audioLevel * 0.5
      : 0.3;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background Glow — color-matched to the avatar, reactive to sound */}
      <motion.div
        animate={{
          scale: glowScale,
          opacity: glowOpacity,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: avatar.colors[0] }}
      />

      <motion.div
        animate={{ y: bodyY }}
        transition={bodyTransition}
        className="relative w-56 h-56 z-10 pointer-events-none"
      >
        {renderAvatar()}
      </motion.div>
    </div>
  );
}

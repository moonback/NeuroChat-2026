import { motion, AnimatePresence } from "motion/react";
import type { AvatarId } from "../lib/avatarConfig";
import { AVATARS } from "../lib/avatarConfig";
import { RobotAvatar } from "./avatars/RobotAvatar";

interface Props {
  status: "idle" | "connecting" | "listening";
  isSpeaking: boolean;
  avatarId?: AvatarId;
  /** Normalized 0-1 audio level from the microphone */
  audioLevel?: number;
  /** True when motion or screen changes are detected */
  visualActivity?: boolean;
}

export function AnimatedCharacter({ status, isSpeaking, avatarId = "robot", audioLevel = 0, visualActivity = false }: Props) {
  const avatar = AVATARS[avatarId];

  // Robust audio level handling
  const safeAudioLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;

  // Helper for safe animation values
  const safe = (val: number, fallback = 0) => {
    return Number.isFinite(val) ? val : fallback;
  };

  // Body bounce — intensity driven by audioLevel when listening
  const bounceIntensity = status === "listening" ? safe(Math.max(5, safeAudioLevel * 20), 5) : 0;

  const bodyY = isSpeaking
    ? [0, -10, 0]
    : status === "listening"
      ? [0, safe(-bounceIntensity), 0]
      : status === "connecting"
        ? [0, -2, 0]
        : [0, 5, 0];

  const bodyTransition = isSpeaking
    ? { duration: 0.3, repeat: Infinity }
    : status === "listening"
      ? { duration: safe(Math.max(0.3, 2 - safeAudioLevel * 1.5), 0.3), repeat: Infinity, ease: "easeInOut" as const }
      : status === "connecting"
        ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const }
        : { duration: 3, repeat: Infinity, ease: "easeInOut" as const };

  /** Render the appropriate avatar SVG */
  function renderAvatar() {
    const props = { status, isSpeaking, audioLevel: safeAudioLevel, visualActivity };
    return <RobotAvatar {...props} />;
  }

  // Glow scale reacts to audio level when listening
  const glowScale = isSpeaking
    ? [1, 1.2, 1]
    : status === "listening"
      ? safe(1 + safeAudioLevel * 0.4, 1)
      : 1;

  const glowOpacity = isSpeaking
    ? 0.8
    : status === "listening"
      ? safe(0.3 + safeAudioLevel * 0.5, 0.3)
      : 0.3;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Visual Activity Glow (Motion Detection) */}
      <AnimatePresence>
        {visualActivity && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.4 }}
            exit={{ scale: 1.8, opacity: 0 }}
            className="absolute w-60 h-60 rounded-full blur-[40px] border-2 border-blue-400/30 pointer-events-none z-0"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.4)" }}
          />
        )}
      </AnimatePresence>

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

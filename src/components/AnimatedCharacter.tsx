import { motion, AnimatePresence } from "motion/react";
import type { AvatarId } from "../lib/avatarConfig";
import { AVATARS } from "../lib/avatarConfig";
import { RobotAvatar } from "./avatars/RobotAvatar";
import type { EmotionMetrics } from "../lib/EmotionEngine";

interface Props {
  status: "idle" | "connecting" | "listening";
  isSpeaking: boolean;
  avatarId?: AvatarId;
  audioLevel?: number;
  visualActivity?: boolean;
  emotionMetrics?: Partial<EmotionMetrics>;
}

const DEFAULT_METRICS: EmotionMetrics = {
  energy: "neutre",
  mood: "neutre",
  confidence: 1,
  trend: "stable",
  isStagnated: false,
  breathingRate: 4,
  moodEmoji: "😐",
  moodColor: "#6366f1",
  rawAudioAvg: 0,
  rawMotionAvg: 0,
};

export function AnimatedCharacter({
  status,
  isSpeaking,
  avatarId = "robot",
  audioLevel = 0,
  visualActivity = false,
  emotionMetrics: partialMetrics,
}: Props) {
  const avatar = AVATARS[avatarId];
  const em = { ...DEFAULT_METRICS, ...partialMetrics };

  // Use EmotionEngine's native color and breathing rate
  const moodColor = em.moodColor;
  const breathingRate = em.breathingRate;

  // Robust audio level handling
  const safeAudioLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;

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
            style={{ backgroundColor: `${moodColor}66` }}
          />
        )}
      </AnimatePresence>

      {/* Breathing Ring — slow inhale/exhale cycle driven by emotion engine */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{
          duration: breathingRate,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-60 h-60 rounded-full pointer-events-none"
        style={{
          border: `2px solid ${moodColor}40`,
          boxShadow: `0 0 20px ${moodColor}20`,
        }}
      />

      {/* Background Glow — color-matched to mood, reactive to sound */}
      <motion.div
        animate={{
          scale: glowScale,
          opacity: glowOpacity,
          backgroundColor: moodColor,
        }}
        transition={{
          backgroundColor: { duration: 2, ease: "easeInOut" },
          scale: { duration: 0.15 },
          opacity: { duration: 0.15 }
        }}
        className="absolute w-56 h-56 rounded-full blur-3xl pointer-events-none"
      />

      {/* Heartbeat pulse based on energy */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.08, 0.2, 0.08],
        }}
        transition={{
          duration: em.energy === "agitation" ? 0.6 : em.energy === "élevée" ? 1.2 : 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{ borderColor: moodColor, border: `1px solid ${moodColor}33` }}
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

import { motion } from "motion/react";
import type { AvatarProps } from "./AvatarProps";

/**
 * Robot Avatar — Metallic high-tech robot with LED eyes and oscilloscope mouth.
 * Audio level drives antenna pulse speed, eye glow intensity, and mouth bar height.
 */
export function RobotAvatar({ status, isSpeaking, audioLevel = 0 }: AvatarProps) {
  // Ensure we have a valid number for calculations to avoid SVG attribute errors
  const safeAudioLevel = typeof audioLevel === 'number' && !isNaN(audioLevel) ? audioLevel : 0;
  const al = status === "listening" ? safeAudioLevel : 0;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_10px_30px_rgba(79,70,229,0.4)]">
      <defs>
        <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Main Antenna — pulse reacts to audioLevel */}
      <motion.g animate={{ rotate: status === "listening" ? [-2, 2, -2] : 0 }} transition={{ duration: 1, repeat: Infinity }}>
        <rect x="98" y="10" width="4" height="25" fill="#475569" rx="2" />
        <motion.circle 
          cx="100" 
          cy="10"
          initial={{ r: 5 }}
          fill={status === "connecting" ? "#EF4444" : "#6366F1"} 
          animate={{ opacity: [1, 0.3 + al * 0.7, 1], r: [5, 5 + al * 3, 5] }}
          transition={{ duration: Math.max(0.15, 0.8 - al * 0.6), repeat: Infinity }}
        />
      </motion.g>

      {/* Side Bolts */}
      <rect x="25" y="85" width="10" height="30" fill="#475569" rx="4" />
      <rect x="165" y="85" width="10" height="30" fill="#475569" rx="4" />

      {/* Head Shell */}
      <rect x="35" y="35" width="130" height="130" rx="30" fill="url(#metalGradient)" />
      
      {/* Face Screen */}
      <rect x="50" y="55" width="100" height="85" rx="15" fill="url(#screenGradient)" stroke="#334155" strokeWidth="2" />

      {/* Grid Lines */}
      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.05" />
      </pattern>
      <rect x="50" y="55" width="100" height="85" rx="15" fill="url(#grid)" />

      <g transform="translate(100, 90)">
        {/* LED Eyes */}
        {status === "connecting" ? (
          <g>
            <rect x="-35" y="-5" width="20" height="4" fill="#6366F1" rx="2" />
            <rect x="15" y="-5" width="20" height="4" fill="#6366F1" rx="2" />
          </g>
        ) : (
          <>
            {/* Eyes glow brighter with audio */}
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <circle cx="-25" cy="0" r="12" fill="url(#eyeGlow)" opacity={0.3 + al * 0.6} />
              <rect x="-32" y="-7" width="14" height="14" rx="3" fill="#818CF8" opacity={0.7 + al * 0.3} className="drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            </motion.g>
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <circle cx="25" cy="0" r="12" fill="url(#eyeGlow)" opacity={0.3 + al * 0.6} />
              <rect x="18" y="-7" width="14" height="14" rx="3" fill="#818CF8" opacity={0.7 + al * 0.3} className="drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            </motion.g>
          </>
        )}

        {/* Mouth — bars react to audioLevel */}
        {isSpeaking ? (
          <motion.g transform="translate(0, 30)">
            <motion.rect x="-25" y="-10" width="4" height="20" fill="#F472B6" animate={{ height: [5, 25, 10] }} transition={{ duration: 0.2, repeat: Infinity }} rx="2" />
            <motion.rect x="-15" y="-12" width="4" height="24" fill="#F472B6" animate={{ height: [10, 30, 15] }} transition={{ duration: 0.15, repeat: Infinity }} rx="2" />
            <motion.rect x="-5" y="-15" width="4" height="30" fill="#F472B6" animate={{ height: [15, 35, 20] }} transition={{ duration: 0.25, repeat: Infinity }} rx="2" />
            <motion.rect x="5" y="-12" width="4" height="24" fill="#F472B6" animate={{ height: [10, 30, 15] }} transition={{ duration: 0.15, repeat: Infinity }} rx="2" />
            <motion.rect x="15" y="-10" width="4" height="20" fill="#F472B6" animate={{ height: [5, 25, 10] }} transition={{ duration: 0.2, repeat: Infinity }} rx="2" />
          </motion.g>
        ) : status === "listening" ? (
          <g transform="translate(0, 30)">
            {/* Audio-reactive equalizer bars */}
            <rect x="-25" y={-2 - al * 8} width="4" height={4 + al * 16} fill="#818CF8" rx="2" opacity={0.4 + al * 0.6} />
            <rect x="-15" y={-3 - al * 12} width="4" height={6 + al * 24} fill="#818CF8" rx="2" opacity={0.4 + al * 0.6} />
            <rect x="-5" y={-4 - al * 14} width="4" height={8 + al * 28} fill="#818CF8" rx="2" opacity={0.4 + al * 0.6} />
            <rect x="5" y={-3 - al * 12} width="4" height={6 + al * 24} fill="#818CF8" rx="2" opacity={0.4 + al * 0.6} />
            <rect x="15" y={-2 - al * 8} width="4" height={4 + al * 16} fill="#818CF8" rx="2" opacity={0.4 + al * 0.6} />
          </g>
        ) : (
          <rect x="-10" y="32" width="20" height="4" rx="2" fill="#334155" />
        )}
      </g>

      {/* Bolts in Corners */}
      <circle cx="45" cy="45" r="3" fill="#334155" />
      <circle cx="155" cy="45" r="3" fill="#334155" />
      <circle cx="45" cy="155" r="3" fill="#334155" />
      <circle cx="155" cy="155" r="3" fill="#334155" />

      {/* Reflection */}
      <path d="M 50 40 Q 100 35 150 40" stroke="white" strokeWidth="2" opacity="0.1" fill="none" />
    </svg>
  );
}

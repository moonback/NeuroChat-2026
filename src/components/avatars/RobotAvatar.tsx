import { useEffect, useRef, useState } from "react";
import type { AvatarProps } from "./AvatarProps";

/**
 * Robot Avatar — Metallic high-tech robot with LED eyes and oscilloscope mouth.
 *
 * Improvements over v1:
 * - Native rAF loop replaces framer-motion static keyframes → 60fps audio reactivity
 * - Natural eye blinking via randomised useEffect interval
 * - Dynamic accent colour per status (idle → violet, listening → cyan, connecting → red)
 * - Halo/glow radial that pulses with audioLevel
 * - Scan-line sweep on the face panel
 * - Eye specular highlights (glass-like realism)
 * - Mouth bars centred vertically (no longer growing only downward)
 * - Antenna glow ring (blurred halo behind the LED)
 * - Improved rivets with double-circle detail
 * - Bottom shadow ellipse to ground the robot
 * - Serial number label UNIT-001
 * - Connecting-mode eyes animate width instead of staying static
 */
export function RobotAvatar({ status, isSpeaking, audioLevel = 0 }: AvatarProps) {
  const safeAl = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;
  const al = status === "listening" ? safeAl : 0;

  // ── rAF tick ──────────────────────────────────────────────────────────────
  const tickRef = useRef(0);
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    let raf: number;
    const loop = () => {
      tickRef.current++;
      forceUpdate((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Blink ─────────────────────────────────────────────────────────────────
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    const schedule = () => {
      const delay = 2500 + Math.random() * 2500;
      return setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          timerRef.current = schedule();
        }, 140);
      }, delay);
    };
    const timerRef = { current: schedule() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const t = tickRef.current * 0.04;

  const antPulse = 0.5 + 0.5 * Math.sin(t * (1 + al * 3));
  const antR = 5 + antPulse * (2 + al * 3);
  const antAngle = status === "listening" ? Math.sin(t * 2) * 3 : 0;

  const eyeScaleY = blinking ? 0.07 : 1;
  const scanY = ((t * 12) % 90);

  const accentColor =
    status === "connecting" ? "#ef4444"
    : status === "listening" ? "#22d3ee"
    : "#818cf8";
  const accentGlow = status === "listening" ? "#06b6d4" : "#6366f1";

  // Mouth bars — centred vertically, animated via rAF
  const BAR_CONFIGS = [
    { x: -25, baseH: 20 },
    { x: -15, baseH: 24 },
    { x:  -5, baseH: 30 },
    { x:   5, baseH: 24 },
    { x:  15, baseH: 20 },
  ] as const;

  const bars = BAR_CONFIGS.map((bar, i) => {
    const phase = i * 0.9;
    let scaleY: number;
    if (isSpeaking) {
      scaleY = 0.3 + 0.7 * Math.abs(Math.sin(t * 6 + phase));
    } else if (status === "listening") {
      scaleY = 0.15 + al * 0.85 * Math.abs(Math.sin(t * 4 + phase));
    } else {
      scaleY = 0.15;
    }
    const h = bar.baseH * scaleY;
    const barColor = isSpeaking ? "#f472b6" : status === "listening" ? accentColor : "#334155";
    const opacity = isSpeaking ? 0.6 + scaleY * 0.4 : status === "listening" ? 0.4 + al * 0.6 : 0.3;
    return { x: bar.x, h, barColor, opacity };
  });

  // Connecting-mode eye width pulses
  const connEyeW = 22 + Math.sin(t * 4) * 4;
  const connEyeW2 = 22 + Math.cos(t * 4) * 4;

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      style={{ filter: "drop-shadow(0 8px 24px rgba(79,70,229,0.45))" }}
    >
      <defs>
        {/* Body gradient */}
        <linearGradient id="ra-mg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#94a3b8" />
          <stop offset="45%"  stopColor="#64748b" />
          <stop offset="100%" stopColor="#3d5068" />
        </linearGradient>

        {/* Screen gradient */}
        <linearGradient id="ra-sg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#0f172a" />
          <stop offset="100%" stopColor="#0a0f1e" />
        </linearGradient>

        {/* Eye gradient — updates with accent */}
        <linearGradient id="ra-egl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.9} />
          <stop offset="100%" stopColor={accentGlow}   stopOpacity={0.3} />
        </linearGradient>

        {/* Halo */}
        <radialGradient id="ra-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.18 * (1 + al)} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
        </radialGradient>

        {/* Blur for antenna glow ring */}
        <filter id="ra-blur">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        {/* Screen clip */}
        <clipPath id="ra-sc">
          <rect x="50" y="55" width="100" height="85" rx="12" />
        </clipPath>
      </defs>

      {/* ── Halo ── */}
      <ellipse cx="100" cy="110" rx="70" ry="60" fill="url(#ra-halo)" opacity={0.6 + al * 0.4} />

      {/* ── Antenna ── */}
      <g transform={`rotate(${antAngle}, 100, 35)`}>
        <rect x="98" y="10" width="4" height="28" fill="#334155" rx="2" />
        {/* Glow ring (blurred) */}
        <circle cx="100" cy="10" r={antR * 1.8} fill={accentColor} opacity={0.08} filter="url(#ra-blur)" />
        {/* LED */}
        <circle cx="100" cy="10" r={antR} fill={accentColor} opacity={0.3 + antPulse * 0.7} />
      </g>

      {/* ── Side bolts ── */}
      <rect x="26" y="83" width="9" height="28" rx="4" fill="#475569" />
      <rect x="165" y="83" width="9" height="28" rx="4" fill="#475569" />
      <rect x="24" y="90" width="4" height="8" rx="2" fill="#334155" />
      <rect x="172" y="90" width="4" height="8" rx="2" fill="#334155" />

      {/* ── Head shell ── */}
      <rect x="35" y="35" width="130" height="130" rx="28" fill="url(#ra-mg)" />
      {/* Top highlight bevel */}
      <rect x="38" y="38" width="124" height="60" rx="20" fill="white" opacity={0.06} />

      {/* ── Face screen ── */}
      <rect x="50" y="55" width="100" height="85" rx="12" fill="url(#ra-sg)" />
      <rect x="50" y="55" width="100" height="85" rx="12" fill="none" stroke={accentColor} strokeWidth={0.8} strokeOpacity={0.4} />

      {/* Horizontal scan lines */}
      {[0,1,2,3,4,5].map((i) => (
        <line key={i} x1="50" y1={58 + i * 12} x2="150" y2={58 + i * 12}
          stroke="#818cf8" strokeWidth={0.5} opacity={0.04 + (i % 2) * 0.02}
          clipPath="url(#ra-sc)" />
      ))}

      {/* Animated scan sweep */}
      <rect
        x="50" y={55 + scanY} width="100" height="3"
        fill={accentColor}
        opacity={status === "connecting" ? 0.12 : 0.06}
        clipPath="url(#ra-sc)"
      />

      {/* ── Eyes & Mouth ── */}
      <g transform="translate(100, 90)">

        {/* Eyes */}
        {status === "connecting" ? (
          <g>
            <rect x={-38} y={-4} width={connEyeW} height={4} fill={accentColor} rx={2} opacity={0.8} />
            <rect x={16}  y={-4} width={connEyeW2} height={4} fill={accentColor} rx={2} opacity={0.8} />
          </g>
        ) : (
          <g transform={`scale(1, ${eyeScaleY})`}>
            {/* Left eye */}
            <rect x={-34} y={-9} width={16} height={16} rx={4} fill="url(#ra-egl)" opacity={0.7 + al * 0.3} />
            <rect x={-30} y={-5} width={6}  height={4}  rx={1} fill="white" opacity={0.4} />
            <circle cx={-26} cy={2} r={3} fill="white" opacity={0.15} />
            {/* Right eye */}
            <rect x={18} y={-9} width={16} height={16} rx={4} fill="url(#ra-egl)" opacity={0.7 + al * 0.3} />
            <rect x={22} y={-5} width={6}  height={4}  rx={1} fill="white" opacity={0.4} />
            <circle cx={26} cy={2} r={3} fill="white" opacity={0.15} />
          </g>
        )}

        {/* Mouth bars — centred on y=30 */}
        <g transform="translate(0, 30)">
          {bars.map((bar) => (
            <rect
              key={bar.x}
              x={bar.x - 2}
              y={-bar.h / 2}
              width={4}
              height={bar.h}
              fill={bar.barColor}
              rx={2}
              opacity={bar.opacity}
            />
          ))}
        </g>
      </g>

      {/* ── Decorative details ── */}
      {/* Top reflection */}
      <path d="M 50 40 Q 100 34 150 40" stroke="white" strokeWidth={1.5} opacity={0.12} fill="none" />
      {/* Bottom shadow */}
      <path d="M 55 165 Q 100 172 145 165" stroke="black" strokeWidth={1.5} opacity={0.2} fill="none" />

      {/* Rivets (double circle) */}
      {([
        [44, 44], [156, 44], [44, 156], [156, 156]
      ] as [number, number][]).map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={3}   fill="#1e293b" />
          <circle cx={cx} cy={cy} r={1.5} fill="#475569" />
        </g>
      ))}

      {/* Serial number */}
      <text
        x="100" y="196"
        textAnchor="middle"
        style={{ font: "600 7px monospace", fill: "#475569", letterSpacing: "0.15em" }}
      >
        UNIT-001
      </text>
    </svg>
  );
}
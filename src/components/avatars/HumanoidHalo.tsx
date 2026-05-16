/**
 * HumanoidHalo - Multi-ring atmospheric aura (replaces RobotHalo)
 */

import React from "react";

interface HumanoidHaloProps {
  accentColor: string;
  accentGlow: string;
  intensity: number;
  pulsePhase: number;
}

export const HumanoidHalo = React.memo<HumanoidHaloProps>(({
  accentColor,
  accentGlow,
  intensity,
  pulsePhase,
}) => {
  const pulse = 1 + Math.sin(pulsePhase) * 0.06;
  const pulse2 = 1 + Math.sin(pulsePhase * 1.3 + 1) * 0.05;
  const baseOp = 0.45 + intensity * 0.28;

  // Side aura colors (blue left, warm right)
  const leftAuraColor = "#80c0e8";
  const rightAuraColor = "#e8a0d0";

  return (
    <g>
      <defs>
        {/* Main centered radial aura */}
        <radialGradient id="h-halo-main" cx="50%" cy="56%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity={0.22 * intensity} />
          <stop offset="38%" stopColor={accentGlow} stopOpacity={0.14 * intensity} />
          <stop offset="70%" stopColor={accentColor} stopOpacity={0.07 * intensity} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>

        {/* Secondary lower atmospheric */}
        <radialGradient id="h-halo-atmo" cx="50%" cy="62%" r="60%">
          <stop offset="0%" stopColor={accentGlow} stopOpacity={0.14 * intensity} />
          <stop offset="55%" stopColor={accentColor} stopOpacity={0.07 * intensity} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>

        {/* Left side aura */}
        <radialGradient id="h-halo-left" cx="15%" cy="50%" r="55%">
          <stop offset="0%" stopColor={leftAuraColor} stopOpacity={0.30 * intensity} />
          <stop offset="100%" stopColor={leftAuraColor} stopOpacity="0" />
        </radialGradient>

        {/* Right side aura */}
        <radialGradient id="h-halo-right" cx="85%" cy="50%" r="55%">
          <stop offset="0%" stopColor={rightAuraColor} stopOpacity={0.28 * intensity} />
          <stop offset="100%" stopColor={rightAuraColor} stopOpacity="0" />
        </radialGradient>

        {/* Soft blur filters */}
        <filter id="h-halo-blur-heavy">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="h-halo-blur-mid">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="h-halo-blur-ring">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Side auras */}
      <ellipse
        cx="100" cy="105"
        rx={195 * pulse2} ry={180 * pulse2}
        fill="url(#h-halo-left)"
        opacity={baseOp * 0.7}
        style={{ filter: "blur(18px)" }}
      />
      <ellipse
        cx="100" cy="105"
        rx={195 * pulse2} ry={180 * pulse2}
        fill="url(#h-halo-right)"
        opacity={baseOp * 0.7}
        style={{ filter: "blur(18px)" }}
      />

      {/* Outer atmospheric blob */}
      <ellipse
        cx="100" cy="115"
        rx={160 * pulse} ry={148 * pulse}
        fill="url(#h-halo-atmo)"
        opacity={baseOp * 0.55}
        style={{ filter: "blur(14px)" }}
      />

      {/* Mid-range glow */}
      <ellipse
        cx="100" cy="108"
        rx={138 * pulse} ry={128 * pulse}
        fill="url(#h-halo-main)"
        opacity={baseOp * 0.75}
        style={{ filter: "blur(9px)" }}
      />

      {/* Inner concentrated blob */}
      <ellipse
        cx="100" cy="105"
        rx={105 * pulse} ry={96 * pulse}
        fill={accentColor}
        opacity={baseOp * intensity * 0.35}
        style={{ filter: "blur(7px)" }}
      />

      {/* Stacked elliptical rings (the key humanoid halo look) */}
      <ellipse
        cx="100" cy="108"
        rx={148 * pulse} ry={136 * pulse}
        fill="none"
        stroke={accentColor}
        strokeWidth={2}
        opacity={0.20 * intensity}
        style={{ filter: "blur(5px)" }}
      />

      <ellipse
        cx="100" cy="108"
        rx={130 * pulse2} ry={120 * pulse2}
        fill="none"
        stroke="#b0d8f8"
        strokeWidth={1.5}
        opacity={0.26 * intensity}
        style={{ filter: "blur(4px)" }}
      />

      <ellipse
        cx="100" cy="108"
        rx={112 * pulse} ry={103 * pulse}
        fill="none"
        stroke="#c8e8ff"
        strokeWidth={1}
        opacity={0.18 * intensity}
        style={{ filter: "blur(3px)" }}
      />

      {/* Close inner ring */}
      <ellipse
        cx="100" cy="105"
        rx={92 * pulse2} ry={85 * pulse2}
        fill="none"
        stroke={accentColor}
        strokeWidth={0.8}
        opacity={0.14 * intensity}
      />

      {/* Top head highlight aura */}
      <ellipse
        cx="100" cy="52"
        rx={52} ry={28}
        fill={accentColor}
        opacity={intensity * 0.16}
        style={{ filter: "blur(12px)" }}
      />

      {/* Floating particles */}
      {[
        { cx: 20, cy: 85, r: 2.2, op: 0.55 },
        { cx: 178, cy: 78, r: 1.8, op: 0.48 },
        { cx: 16, cy: 130, r: 1.6, op: 0.38 },
        { cx: 182, cy: 140, r: 1.5, op: 0.35 },
        { cx: 32, cy: 55, r: 1.4, op: 0.3 },
        { cx: 170, cy: 60, r: 1.3, op: 0.28 },
      ].map((p, i) => (
        <circle
          key={i}
          cx={p.cx} cy={p.cy} r={p.r}
          fill={i % 2 === 0 ? leftAuraColor : rightAuraColor}
          opacity={p.op * intensity}
        />
      ))}
    </g>
  );
});

HumanoidHalo.displayName = "HumanoidHalo";

/**
 * RobotHalo - Atmospheric glow and environmental effects
 */

import React from "react";

interface RobotHaloProps {
  accentColor: string;
  accentGlow: string;
  intensity: number;
  pulsePhase: number;
}

export const RobotHalo = React.memo<RobotHaloProps>(({
  accentColor,
  accentGlow,
  intensity,
  pulsePhase,
}) => {
  const baseOpacity = 0.5 + intensity * 0.3;
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.08;

  return (
    <g>
      <defs>
        {/* Primary halo gradient */}
        <radialGradient id="robot-halo-primary" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity={0.25 * intensity} />
          <stop offset="40%" stopColor={accentGlow} stopOpacity={0.15 * intensity} />
          <stop offset="70%" stopColor={accentColor} stopOpacity={0.08 * intensity} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>

        {/* Secondary atmospheric glow */}
        <radialGradient id="robot-halo-secondary" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={accentGlow} stopOpacity={0.15 * intensity} />
          <stop offset="50%" stopColor={accentColor} stopOpacity={0.08 * intensity} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>

        {/* Soft blur filter */}
        <filter id="robot-halo-blur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* Outer atmospheric glow */}
      <ellipse
        cx="100"
        cy="115"
        rx={85 * pulseScale}
        ry={75 * pulseScale}
        fill="url(#robot-halo-secondary)"
        opacity={baseOpacity * 0.6}
        style={{ filter: "blur(12px)" }}
      />

      {/* Mid-range glow */}
      <ellipse
        cx="100"
        cy="110"
        rx={75 * pulseScale}
        ry={65 * pulseScale}
        fill="url(#robot-halo-primary)"
        opacity={baseOpacity * 0.8}
        style={{ filter: "blur(8px)" }}
      />

      {/* Inner concentrated glow */}
      <ellipse
        cx="100"
        cy="108"
        rx={60 * pulseScale}
        ry={52 * pulseScale}
        fill={accentColor}
        opacity={baseOpacity * intensity * 0.4}
        style={{ filter: "blur(6px)" }}
      />

      {/* Subtle top highlight */}
      <ellipse
        cx="100"
        cy="70"
        rx={45}
        ry={25}
        fill={accentColor}
        opacity={intensity * 0.15}
        style={{ filter: "blur(10px)" }}
      />
    </g>
  );
});

RobotHalo.displayName = "RobotHalo";

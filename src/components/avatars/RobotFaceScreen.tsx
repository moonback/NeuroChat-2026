/**
 * RobotFaceScreen - OLED/glass face panel with animated effects
 */

import React from "react";

interface RobotFaceScreenProps {
  accentColor: string;
  scanProgress: number;
  status: string;
  glowIntensity: number;
}

export const RobotFaceScreen = React.memo<RobotFaceScreenProps>(({
  accentColor,
  scanProgress,
  status,
  glowIntensity,
}) => {
  return (
    <g>
      <defs>
        {/* OLED screen gradient */}
        <linearGradient id="robot-screen-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#0a0f1e" />
          <stop offset="100%" stopColor="#050810" />
        </linearGradient>

        {/* Glass reflection gradient */}
        <linearGradient id="robot-screen-reflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="30%" stopColor="white" stopOpacity="0.02" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Animated light streak */}
        <linearGradient id="robot-light-streak" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
          <stop offset="50%" stopColor={accentColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>

        {/* Screen clip path */}
        <clipPath id="robot-screen-clip">
          <rect x="50" y="55" width="100" height="85" rx="12" />
        </clipPath>

        {/* Inner glow */}
        <radialGradient id="robot-screen-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base screen surface */}
      <rect
        x="50"
        y="55"
        width="100"
        height="85"
        rx="12"
        fill="url(#robot-screen-bg)"
      />

      {/* Internal glow */}
      <rect
        x="50"
        y="55"
        width="100"
        height="85"
        rx="12"
        fill="url(#robot-screen-glow)"
        opacity={glowIntensity * 0.6}
      />

      {/* Horizontal scan lines (static) */}
      <g clipPath="url(#robot-screen-clip)">
        {Array.from({ length: 28 }, (_, i) => (
          <line
            key={`scanline-${i}`}
            x1="50"
            y1={58 + i * 3}
            x2="150"
            y2={58 + i * 3}
            stroke="#818cf8"
            strokeWidth={0.4}
            opacity={0.03 + (i % 3 === 0 ? 0.02 : 0)}
          />
        ))}
      </g>

      {/* Animated scan sweep */}
      <g clipPath="url(#robot-screen-clip)">
        <rect
          x="50"
          y={55 + (scanProgress % 85)}
          width="100"
          height="4"
          fill={accentColor}
          opacity={status === "connecting" || status === "thinking" ? 0.15 : 0.08}
          style={{ filter: "blur(2px)" }}
        />
        <rect
          x="50"
          y={55 + (scanProgress % 85)}
          width="100"
          height="1"
          fill={accentColor}
          opacity={status === "connecting" || status === "thinking" ? 0.4 : 0.2}
        />
      </g>

      {/* Animated light streak (diagonal) */}
      <g clipPath="url(#robot-screen-clip)">
        <rect
          x={50 + ((scanProgress * 0.5) % 120) - 20}
          y="55"
          width="30"
          height="85"
          fill="url(#robot-light-streak)"
          opacity={0.4}
          transform={`skewX(-15)`}
        />
      </g>

      {/* Glass reflection overlay */}
      <rect
        x="50"
        y="55"
        width="100"
        height="85"
        rx="12"
        fill="url(#robot-screen-reflection)"
      />

      {/* Screen border with accent glow */}
      <rect
        x="50"
        y="55"
        width="100"
        height="85"
        rx="12"
        fill="none"
        stroke={accentColor}
        strokeWidth="1"
        opacity={0.3 * glowIntensity}
      />

      {/* Outer glow border */}
      <rect
        x="50"
        y="55"
        width="100"
        height="85"
        rx="12"
        fill="none"
        stroke={accentColor}
        strokeWidth="2"
        opacity={0.15 * glowIntensity}
        style={{ filter: "blur(2px)" }}
      />

      {/* Corner accent details */}
      {[
        { x: 52, y: 57, angle: 0 },
        { x: 148, y: 57, angle: 90 },
        { x: 52, y: 138, angle: 270 },
        { x: 148, y: 138, angle: 180 },
      ].map((corner, i) => (
        <g key={`corner-${i}`} transform={`translate(${corner.x}, ${corner.y}) rotate(${corner.angle})`}>
          <line x1="0" y1="0" x2="8" y2="0" stroke={accentColor} strokeWidth="1" opacity={0.4} />
          <line x1="0" y1="0" x2="0" y2="8" stroke={accentColor} strokeWidth="1" opacity={0.4} />
        </g>
      ))}
    </g>
  );
});

RobotFaceScreen.displayName = "RobotFaceScreen";

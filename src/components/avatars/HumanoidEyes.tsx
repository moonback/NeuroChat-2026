/**
 * HumanoidEyes - Organic LED eyes with brow ridges (replaces RobotEyes)
 */

import React from "react";
import type { RobotStatus } from "./RobotAvatar.types";

interface HumanoidEyesProps {
  status: RobotStatus;
  eyeColor: string;
  accentGlow: string;
  blinking: boolean;
  eyeOffsetX: number;
  eyeOffsetY: number;
  audioReactivity: number;
  time: number;
}

export const HumanoidEyes = React.memo<HumanoidEyesProps>(({
  status,
  eyeColor,
  accentGlow,
  blinking,
  eyeOffsetX,
  eyeOffsetY,
  audioReactivity,
  time,
}) => {
  const eyeScaleY = blinking ? 0.05 : 1;
  const eyeGlow = 0.65 + audioReactivity * 0.35;
  const pupilDilation = 1 + audioReactivity * 0.18;

  // Thinking: horizontal scan
  const thinkingScanX = status === "thinking" ? Math.sin(time * 0.003) * 7 : 0;

  // Connecting: pulsing bar width
  const connectingW1 = status === "connecting" ? 18 + Math.sin(time * 0.004) * 5 : 20;
  const connectingW2 = status === "connecting" ? 18 + Math.cos(time * 0.004) * 5 : 20;

  // Error flicker
  const errorFlicker = status === "error" && Math.sin(time * 0.02) > 0.7 ? 0.25 : 1;

  // Muted dim
  const mutedDim = status === "muted" ? 0.38 : 1;

  const totalOpacity = errorFlicker * mutedDim;

  // Eye positions (relative to group at 100,90)
  const leftX = -32;
  const rightX = 32;
  const eyeY = 0;
  const eyeRx = 13;
  const eyeRy = 11;

  return (
    <g transform="translate(100, 90)">
      <defs>
        <radialGradient id="h-eye-iris" cx="35%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#b8e4f8" />
          <stop offset="50%" stopColor={eyeColor} />
          <stop offset="100%" stopColor={accentGlow} />
        </radialGradient>

        <radialGradient id="h-pupil" cx="40%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#08182c" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>

        <radialGradient id="h-eye-glass" cx="28%" cy="28%" r="72%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="55%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <filter id="h-eye-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="h-eye-blur-soft">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {status === "connecting" ? (
        // Boot sequence: horizontal bars
        <g opacity={totalOpacity}>
          {/* Left bar */}
          <g>
            <rect x={leftX - connectingW1 / 2 - 2} y={-4} width={connectingW1 + 4} height={8}
              rx={4} fill={eyeColor} opacity={0.25} style={{ filter: "blur(4px)" }} />
            <rect x={leftX - connectingW1 / 2} y={-2.5} width={connectingW1} height={5}
              rx={2.5} fill="url(#h-eye-iris)" opacity={0.95} />
          </g>
          {/* Right bar */}
          <g>
            <rect x={rightX - connectingW2 / 2 - 2} y={-4} width={connectingW2 + 4} height={8}
              rx={4} fill={eyeColor} opacity={0.25} style={{ filter: "blur(4px)" }} />
            <rect x={rightX - connectingW2 / 2} y={-2.5} width={connectingW2} height={5}
              rx={2.5} fill="url(#h-eye-iris)" opacity={0.95} />
          </g>
        </g>
      ) : (
        // Normal organic eyes
        <g transform={`scale(1, ${eyeScaleY})`} opacity={totalOpacity}>

          {/* LEFT EYE */}
          <g transform={`translate(${leftX + eyeOffsetX + thinkingScanX}, ${eyeY + eyeOffsetY})`}>
            {/* Brow ridge */}
            <path
              d={`M ${-eyeRx - 4} ${-eyeRy - 9} Q 0 ${-eyeRy - 15} ${eyeRx + 4} ${-eyeRy - 9}`}
              fill="none" stroke="#90b0c8" strokeWidth={2.2} strokeLinecap="round" opacity={0.7}
            />

            {/* Socket shadow */}
            <ellipse cx={0} cy={1} rx={eyeRx + 4} ry={eyeRy + 4} fill="#0a1828" opacity={0.5} />

            {/* Outer glow */}
            <ellipse cx={0} cy={0} rx={eyeRx + 5} ry={eyeRy + 5}
              fill={eyeColor} opacity={0.18 * eyeGlow} style={{ filter: "blur(5px)" }} />

            {/* Iris */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy} fill="url(#h-eye-iris)" opacity={eyeGlow} />

            {/* Pupil */}
            <ellipse
              cx={0} cy={0}
              rx={eyeRx * 0.48 * pupilDilation} ry={eyeRy * 0.48 * pupilDilation}
              fill="url(#h-pupil)"
            />

            {/* Iris ring glow */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy}
              fill="none" stroke={eyeColor} strokeWidth={1.5}
              opacity={0.55 * eyeGlow} style={{ filter: "blur(2px)" }} />

            {/* Glass specular main */}
            <ellipse cx={-eyeRx * 0.35} cy={-eyeRy * 0.35} rx={eyeRx * 0.35} ry={eyeRy * 0.28}
              fill="url(#h-eye-glass)" />

            {/* Small specular dot */}
            <circle cx={-eyeRx * 0.22} cy={-eyeRy * 0.3} r={2} fill="white" opacity={0.75} />

            {/* Eyelid upper */}
            <path
              d={`M ${-eyeRx - 2} ${-eyeRy * 0.3} Q 0 ${-eyeRy - 7} ${eyeRx + 2} ${-eyeRy * 0.3}`}
              fill="#a0bcd0" opacity={0.45}
            />
            {/* Eyelid lower */}
            <path
              d={`M ${-eyeRx} ${eyeRy * 0.5} Q 0 ${eyeRy + 5} ${eyeRx} ${eyeRy * 0.5}`}
              fill="#8090a8" opacity={0.28}
            />

            {/* Eyelash hint upper */}
            <path
              d={`M ${-eyeRx - 1} ${-eyeRy * 0.25} Q 0 ${-eyeRy - 8} ${eyeRx + 1} ${-eyeRy * 0.25}`}
              fill="none" stroke="#6080a0" strokeWidth={1} opacity={0.35}
            />
          </g>

          {/* RIGHT EYE */}
          <g transform={`translate(${rightX - eyeOffsetX - thinkingScanX}, ${eyeY + eyeOffsetY})`}>
            {/* Brow ridge */}
            <path
              d={`M ${-eyeRx - 4} ${-eyeRy - 9} Q 0 ${-eyeRy - 15} ${eyeRx + 4} ${-eyeRy - 9}`}
              fill="none" stroke="#90b0c8" strokeWidth={2.2} strokeLinecap="round" opacity={0.7}
            />

            {/* Socket shadow */}
            <ellipse cx={0} cy={1} rx={eyeRx + 4} ry={eyeRy + 4} fill="#0a1828" opacity={0.5} />

            {/* Outer glow */}
            <ellipse cx={0} cy={0} rx={eyeRx + 5} ry={eyeRy + 5}
              fill={eyeColor} opacity={0.18 * eyeGlow} style={{ filter: "blur(5px)" }} />

            {/* Iris */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy} fill="url(#h-eye-iris)" opacity={eyeGlow} />

            {/* Pupil */}
            <ellipse
              cx={0} cy={0}
              rx={eyeRx * 0.48 * pupilDilation} ry={eyeRy * 0.48 * pupilDilation}
              fill="url(#h-pupil)"
            />

            {/* Iris ring glow */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy}
              fill="none" stroke={eyeColor} strokeWidth={1.5}
              opacity={0.55 * eyeGlow} style={{ filter: "blur(2px)" }} />

            {/* Glass specular main */}
            <ellipse cx={-eyeRx * 0.35} cy={-eyeRy * 0.35} rx={eyeRx * 0.35} ry={eyeRy * 0.28}
              fill="url(#h-eye-glass)" />

            {/* Small specular dot */}
            <circle cx={-eyeRx * 0.22} cy={-eyeRy * 0.3} r={2} fill="white" opacity={0.75} />

            {/* Eyelid upper */}
            <path
              d={`M ${-eyeRx - 2} ${-eyeRy * 0.3} Q 0 ${-eyeRy - 7} ${eyeRx + 2} ${-eyeRy * 0.3}`}
              fill="#a0bcd0" opacity={0.45}
            />
            {/* Eyelid lower */}
            <path
              d={`M ${-eyeRx} ${eyeRy * 0.5} Q 0 ${eyeRy + 5} ${eyeRx} ${eyeRy * 0.5}`}
              fill="#8090a8" opacity={0.28}
            />

            {/* Eyelash hint */}
            <path
              d={`M ${-eyeRx - 1} ${-eyeRy * 0.25} Q 0 ${-eyeRy - 8} ${eyeRx + 1} ${-eyeRy * 0.25}`}
              fill="none" stroke="#6080a0" strokeWidth={1} opacity={0.35}
            />
          </g>

        </g>
      )}
    </g>
  );
});

HumanoidEyes.displayName = "HumanoidEyes";

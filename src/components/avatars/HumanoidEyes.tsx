/**
 * HumanoidEyes - Organic LED eyes with deep sockets and procedural iris (replaces RobotEyes)
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
  const eyeGlow = 0.65 + audioReactivity * 0.45;
  const pupilDilation = 1 + audioReactivity * 0.25;

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
  // Adjusted for more human proportions (closer together, slightly smaller)
  const leftX = -26;
  const rightX = 26;
  const eyeY = 5;
  const eyeRx = 11;
  const eyeRy = 8.5;

  return (
    <g transform="translate(100, 90)">
      <defs>
        {/* Procedural Iris Texture */}
        <filter id="h-iris-texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" in="noise" result="alphaNoise" />
          <feComposite operator="in" in="alphaNoise" in2="SourceGraphic" result="texture" />
          <feBlend mode="multiply" in="texture" in2="SourceGraphic" />
        </filter>

        <radialGradient id="h-eye-iris" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="15%" stopColor="#a3d5f5" />
          <stop offset="50%" stopColor={eyeColor} />
          <stop offset="85%" stopColor={accentGlow} />
          <stop offset="100%" stopColor="#040a12" /> {/* Deep outer ring */}
        </radialGradient>

        <radialGradient id="h-pupil" cx="40%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#102540" />
          <stop offset="80%" stopColor="#000000" />
        </radialGradient>

        <radialGradient id="h-eye-glass-primary" cx="30%" cy="25%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.85" />
          <stop offset="30%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="h-eye-glass-secondary" cx="70%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#cce5ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Human Sclera Gradient */}
        <radialGradient id="h-sclera" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#f5f0f0" />
          <stop offset="100%" stopColor="#e8caca" /> {/* Slight blood/pink rim */}
        </radialGradient>

        <filter id="h-eye-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="h-eye-blur-soft">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        
        {/* Inner shadow for the socket to embed the eye deeper */}
        <filter id="h-inner-shadow">
          <feOffset dx="0" dy="2"/>
          <feGaussianBlur stdDeviation="2" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood floodColor="#3d1d16" floodOpacity="0.6" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>
      </defs>

      {status === "connecting" ? (
        // Boot sequence: horizontal bars
        <g opacity={totalOpacity}>
          {/* Left bar */}
          <g>
            <rect x={leftX - connectingW1 / 2 - 2} y={-4} width={connectingW1 + 4} height={8}
              rx={4} fill={eyeColor} opacity={0.3} style={{ filter: "blur(5px)" }} />
            <rect x={leftX - connectingW1 / 2} y={-2.5} width={connectingW1} height={5}
              rx={2.5} fill="url(#h-eye-iris)" opacity={0.95} />
          </g>
          {/* Right bar */}
          <g>
            <rect x={rightX - connectingW2 / 2 - 2} y={-4} width={connectingW2 + 4} height={8}
              rx={4} fill={eyeColor} opacity={0.3} style={{ filter: "blur(5px)" }} />
            <rect x={rightX - connectingW2 / 2} y={-2.5} width={connectingW2} height={5}
              rx={2.5} fill="url(#h-eye-iris)" opacity={0.95} />
          </g>
        </g>
      ) : (
        // Normal organic eyes
        <g transform={`scale(1, ${eyeScaleY})`} opacity={totalOpacity}>

          {/* LEFT EYE */}
          <g transform={`translate(${leftX + eyeOffsetX + thinkingScanX}, ${eyeY + eyeOffsetY})`}>
            {/* Soft Skin Socket shadow (Ambient Occlusion) - no longer pure black */}
            <ellipse cx={0} cy={1} rx={eyeRx + 4} ry={eyeRy + 3} fill="#5e281b" opacity={0.3} style={{ filter: "blur(3px)" }} />

            {/* Brow ridge - warmer human shadow */}
            <path
              d={`M ${-eyeRx - 6} ${-eyeRy - 6} Q 0 ${-eyeRy - 12} ${eyeRx + 6} ${-eyeRy - 6}`}
              fill="none" stroke="#875340" strokeWidth={3} strokeLinecap="round" opacity={0.5}
              style={{ filter: "blur(1px)" }}
            />

            {/* Sclera/Base background of the eye (White instead of black) */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy} fill="url(#h-sclera)" filter="url(#h-inner-shadow)" />

            {/* Iris with procedural texture */}
            <g filter="url(#h-iris-texture)">
              <ellipse cx={0} cy={0} rx={eyeRx * 0.55} ry={eyeRy * 0.8} fill="url(#h-eye-iris)" opacity={eyeGlow} />
            </g>

            {/* Pupil */}
            <ellipse
              cx={0} cy={0}
              rx={eyeRx * 0.25 * pupilDilation} ry={eyeRy * 0.4 * pupilDilation}
              fill="url(#h-pupil)"
            />

            {/* Glass specular main (Fresnel reflection) */}
            <ellipse cx={-eyeRx * 0.3} cy={-eyeRy * 0.3} rx={eyeRx * 0.4} ry={eyeRy * 0.3}
              fill="url(#h-eye-glass-primary)" />
              
            {/* Secondary specular reflection */}
            <ellipse cx={eyeRx * 0.3} cy={eyeRy * 0.4} rx={eyeRx * 0.3} ry={eyeRy * 0.2}
              fill="url(#h-eye-glass-secondary)" />

            {/* Sharp specular dot */}
            <circle cx={-eyeRx * 0.25} cy={-eyeRy * 0.35} r={1.5} fill="white" opacity={0.9} />
            <circle cx={-eyeRx * 0.4} cy={-eyeRy * 0.15} r={0.8} fill="white" opacity={0.6} />

            {/* Eyelid upper (Casting shadow on the eye) */}
            <path
              d={`M ${-eyeRx - 2} ${-eyeRy * 0.2} Q 0 ${-eyeRy - 6} ${eyeRx + 2} ${-eyeRy * 0.2}`}
              fill="#c47458" opacity={0.6}
            />
            {/* Eyelid lower */}
            <path
              d={`M ${-eyeRx} ${eyeRy * 0.4} Q 0 ${eyeRy + 5} ${eyeRx} ${eyeRy * 0.4}`}
              fill="#a55d48" opacity={0.5}
            />

            {/* Eyelash hint upper */}
            <path
              d={`M ${-eyeRx - 1} ${-eyeRy * 0.25} Q 0 ${-eyeRy - 7} ${eyeRx + 1} ${-eyeRy * 0.25}`}
              fill="none" stroke="#2a120d" strokeWidth={1.5} opacity={0.5}
            />
          </g>

          {/* RIGHT EYE */}
          <g transform={`translate(${rightX - eyeOffsetX - thinkingScanX}, ${eyeY + eyeOffsetY})`}>
            {/* Soft Skin Socket shadow (Ambient Occlusion) */}
            <ellipse cx={0} cy={1} rx={eyeRx + 4} ry={eyeRy + 3} fill="#5e281b" opacity={0.3} style={{ filter: "blur(3px)" }} />

            {/* Brow ridge - warmer human shadow */}
            <path
              d={`M ${-eyeRx - 6} ${-eyeRy - 6} Q 0 ${-eyeRy - 12} ${eyeRx + 6} ${-eyeRy - 6}`}
              fill="none" stroke="#875340" strokeWidth={3} strokeLinecap="round" opacity={0.5}
              style={{ filter: "blur(1px)" }}
            />

            {/* Sclera/Base background of the eye (White instead of black) */}
            <ellipse cx={0} cy={0} rx={eyeRx} ry={eyeRy} fill="url(#h-sclera)" filter="url(#h-inner-shadow)" />

            {/* Iris with procedural texture */}
            <g filter="url(#h-iris-texture)">
              <ellipse cx={0} cy={0} rx={eyeRx * 0.55} ry={eyeRy * 0.8} fill="url(#h-eye-iris)" opacity={eyeGlow} />
            </g>

            {/* Pupil */}
            <ellipse
              cx={0} cy={0}
              rx={eyeRx * 0.25 * pupilDilation} ry={eyeRy * 0.4 * pupilDilation}
              fill="url(#h-pupil)"
            />

            {/* Glass specular main (Fresnel reflection) */}
            <ellipse cx={-eyeRx * 0.3} cy={-eyeRy * 0.3} rx={eyeRx * 0.4} ry={eyeRy * 0.3}
              fill="url(#h-eye-glass-primary)" />
              
            {/* Secondary specular reflection */}
            <ellipse cx={eyeRx * 0.3} cy={eyeRy * 0.4} rx={eyeRx * 0.3} ry={eyeRy * 0.2}
              fill="url(#h-eye-glass-secondary)" />

            {/* Sharp specular dot */}
            <circle cx={-eyeRx * 0.25} cy={-eyeRy * 0.35} r={1.5} fill="white" opacity={0.9} />
            <circle cx={-eyeRx * 0.4} cy={-eyeRy * 0.15} r={0.8} fill="white" opacity={0.6} />

            {/* Eyelid upper */}
            <path
              d={`M ${-eyeRx - 2} ${-eyeRy * 0.2} Q 0 ${-eyeRy - 6} ${eyeRx + 2} ${-eyeRy * 0.2}`}
              fill="#c47458" opacity={0.6}
            />
            {/* Eyelid lower */}
            <path
              d={`M ${-eyeRx} ${eyeRy * 0.4} Q 0 ${eyeRy + 5} ${eyeRx} ${eyeRy * 0.4}`}
              fill="#a55d48" opacity={0.5}
            />

            {/* Eyelash hint */}
            <path
              d={`M ${-eyeRx - 1} ${-eyeRy * 0.25} Q 0 ${-eyeRy - 7} ${eyeRx + 1} ${-eyeRy * 0.25}`}
              fill="none" stroke="#2a120d" strokeWidth={1.5} opacity={0.5}
            />
          </g>

        </g>
      )}
    </g>
  );
});

HumanoidEyes.displayName = "HumanoidEyes";

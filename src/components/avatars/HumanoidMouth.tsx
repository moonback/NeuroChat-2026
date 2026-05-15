/**
 * HumanoidMouth - Organic lip-shaped audio visualizer (replaces RobotMouth)
 */

import React from "react";
import { getBarPhaseOffset } from "./RobotAvatar.utils";
import type { RobotStatus } from "./RobotAvatar.types";

interface HumanoidMouthProps {
  status: RobotStatus;
  isSpeaking: boolean;
  mouthColor: string;
  audioReactivity: number;
  time: number;
}

export const HumanoidMouth = React.memo<HumanoidMouthProps>(({
  status,
  isSpeaking,
  mouthColor,
  audioReactivity,
  time,
}) => {
  // Compute mouth open amount based on state
  let openAmount = 0;
  let wavePhase = 0;

  if (isSpeaking || status === "speaking") {
    wavePhase = Math.abs(Math.sin(time * 0.006));
    openAmount = 6 + wavePhase * 10;
  } else if (status === "listening") {
    wavePhase = Math.abs(Math.sin(time * 0.004));
    openAmount = 2 + audioReactivity * 8 * wavePhase;
  } else if (status === "thinking") {
    wavePhase = Math.abs(Math.sin(time * 0.0015));
    openAmount = 1 + wavePhase * 2.5;
  } else if (status === "muted") {
    openAmount = 0;
  } else if (status === "error") {
    const glitch = Math.sin(time * 0.015) > 0.6 ? 1 : 0.2;
    openAmount = 2 + glitch * 6;
  } else {
    // idle
    wavePhase = Math.abs(Math.sin(time * 0.001));
    openAmount = wavePhase * 1.5;
  }

  const muted = status === "muted" ? 0.4 : 1;

  // Upper lip path
  const upperLip = `M -20 0 Q -10 -5 0 -1 Q 10 -5 20 0`;

  // Lower lip path - drops by openAmount
  const lowerLipY = openAmount;
  const lowerLip = `M -20 0 Q 0 ${8 + lowerLipY} 20 0`;

  // Waveform inside mouth (for speaking)
  const barColors = Array.from({ length: 5 }, (_, i) => {
    const phase = getBarPhaseOffset(i, 7);
    const wave = Math.abs(Math.sin(time * 0.006 + phase));
    return {
      x: -14 + i * 7,
      h: openAmount > 2 ? (openAmount * 0.5) * wave : 0,
    };
  });

  return (
    <g transform="translate(100, 148)" opacity={muted}>
      <defs>
        <linearGradient id="h-mouth-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a1828" />
          <stop offset="100%" stopColor="#1a2840" />
        </linearGradient>
        <linearGradient id="h-lower-lip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b0c8dc" />
          <stop offset="100%" stopColor="#6888a4" />
        </linearGradient>
      </defs>

      {/* Inner mouth cavity (shows when open) */}
      {openAmount > 0.5 && (
        <path
          d={`M -20 0 Q 0 ${8 + lowerLipY} 20 0 Q 10 -5 0 -1 Q -10 -5 -20 0`}
          fill="url(#h-mouth-inner)"
          opacity={0.8}
        />
      )}

      {/* Audio bars inside (speaking) */}
      {(isSpeaking || status === "speaking") && openAmount > 3 &&
        barColors.map((bar, i) => (
          <rect
            key={i}
            x={bar.x - 2}
            y={-bar.h / 2 + openAmount * 0.2}
            width={3.5}
            height={bar.h}
            rx={1.5}
            fill={mouthColor}
            opacity={0.6}
          />
        ))
      }

      {/* Waveform line (speaking/listening) */}
      {(isSpeaking || status === "speaking" || status === "listening") && openAmount > 1.5 && (
        <path
          d={`M -16 ${openAmount * 0.4} Q -8 ${openAmount * 0.4 - openAmount * 0.5 * Math.sin(time * 0.008)} 0 ${openAmount * 0.4} Q 8 ${openAmount * 0.4 + openAmount * 0.5 * Math.sin(time * 0.008 + 1)} 16 ${openAmount * 0.4}`}
          fill="none"
          stroke={mouthColor}
          strokeWidth={1}
          opacity={0.45}
          strokeLinecap="round"
        />
      )}

      {/* Upper lip */}
      <path
        d={upperLip}
        fill="none"
        stroke="#8098b2"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.88}
      />

      {/* Lower lip shape fill */}
      <path d={lowerLip} fill="url(#h-lower-lip)" opacity={0.32} />

      {/* Lower lip stroke */}
      <path
        d={`M -18 1 Q 0 ${7 + lowerLipY * 0.85} 18 1`}
        fill="none"
        stroke="#a8c4d8"
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.52}
      />

      {/* Mouth center line / aperture */}
      <path
        d={`M -20 0 Q 0 ${openAmount * 0.15} 20 0`}
        fill="none"
        stroke="#4868a0"
        strokeWidth={0.9}
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Lip highlight */}
      <ellipse cx={0} cy={3 + lowerLipY * 0.5} rx={11} ry={3} fill="white" opacity={0.13} />

      {/* Corner accents */}
      <circle cx={-20} cy={0} r={1.5} fill={mouthColor} opacity={0.3} />
      <circle cx={20} cy={0} r={1.5} fill={mouthColor} opacity={0.3} />
    </g>
  );
});

HumanoidMouth.displayName = "HumanoidMouth";

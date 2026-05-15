/**
 * HumanoidMouth - Organic lip-shaped audio visualizer with 3D volume
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
  const upperLip = `M -20 0 Q -10 -6 0 -2 Q 10 -6 20 0`;
  const upperLipHighlight = `M -16 -1 Q -8 -6 0 -3 Q 8 -6 16 -1`;

  // Lower lip path - drops by openAmount
  const lowerLipY = openAmount;
  const lowerLip = `M -20 0 Q 0 ${8 + lowerLipY} 20 0`;
  const lowerLipShadow = `M -22 1 Q 0 ${12 + lowerLipY} 22 1`;

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
          <stop offset="0%" stopColor="#2a0808" />
          <stop offset="100%" stopColor="#0a0202" />
        </linearGradient>
        
        {/* Volumetric upper lip - neutral boyish tone */}
        <linearGradient id="h-upper-lip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d49b8c" />
          <stop offset="60%" stopColor="#b57665" />
          <stop offset="100%" stopColor="#8c4738" />
        </linearGradient>

        {/* Volumetric lower lip - neutral boyish tone */}
        <linearGradient id="h-lower-lip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e5a897" />
          <stop offset="40%" stopColor="#c78472" />
          <stop offset="100%" stopColor="#9e5241" />
        </linearGradient>
      </defs>

      {/* Drop shadow under the lower lip (Ambient Occlusion) */}
      <path
        d={lowerLipShadow}
        fill="none" stroke="#3d1d16" strokeWidth={3} strokeLinecap="round"
        opacity={0.3} style={{ filter: "blur(2px)" }}
      />

      {/* Inner mouth cavity (shows when open) */}
      {openAmount > 0.5 && (
        <path
          d={`M -20 0 Q 0 ${8 + lowerLipY} 20 0 Q 10 -5 0 -1 Q -10 -5 -20 0`}
          fill="url(#h-mouth-inner)"
          opacity={0.9}
        />
      )}

      {/* Deep shadow right inside the lips */}
      {openAmount > 0.5 && (
        <path
          d={`M -20 0 Q 0 ${8 + lowerLipY} 20 0`}
          fill="none" stroke="#000000" strokeWidth={1.5}
          opacity={0.6} style={{ filter: "blur(1px)" }}
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
            opacity={0.7}
            style={{ filter: "drop-shadow(0 0 3px " + mouthColor + ")" }}
          />
        ))
      }

      {/* Waveform line (speaking/listening) */}
      {(isSpeaking || status === "speaking" || status === "listening") && openAmount > 1.5 && (
        <path
          d={`M -16 ${openAmount * 0.4} Q -8 ${openAmount * 0.4 - openAmount * 0.5 * Math.sin(time * 0.008)} 0 ${openAmount * 0.4} Q 8 ${openAmount * 0.4 + openAmount * 0.5 * Math.sin(time * 0.008 + 1)} 16 ${openAmount * 0.4}`}
          fill="none"
          stroke={mouthColor}
          strokeWidth={1.2}
          opacity={0.6}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 2px " + mouthColor + ")" }}
        />
      )}

      {/* Upper lip base */}
      <path
        d={upperLip}
        fill="none"
        stroke="url(#h-upper-lip)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.8}
      />
      {/* Upper lip highlight */}
      <path
        d={upperLipHighlight}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.2}
      />

      {/* Lower lip shape fill */}
      <path d={lowerLip} fill="url(#h-lower-lip)" opacity={0.5} />

      {/* Lower lip outer edge stroke (rim light) */}
      <path
        d={`M -18 1 Q 0 ${7 + lowerLipY * 0.85} 18 1`}
        fill="none"
        stroke="#a8c4d8"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />

      {/* Mouth center line / aperture (when closed) */}
      {openAmount < 1.5 && (
        <path
          d={`M -20 0 Q 0 ${openAmount * 0.15} 20 0`}
          fill="none"
          stroke="#202a35"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.8}
        />
      )}

      {/* Central lower lip specular highlight */}
      <ellipse cx={0} cy={3 + lowerLipY * 0.5} rx={12} ry={3} fill="white" opacity={0.25} style={{ filter: "blur(1px)" }} />
      <ellipse cx={0} cy={2.5 + lowerLipY * 0.5} rx={5} ry={1} fill="white" opacity={0.5} />

      {/* Corner dimples (Ambient occlusion) */}
      <circle cx={-21} cy={0} r={2} fill="#101820" opacity={0.4} style={{ filter: "blur(1px)" }} />
      <circle cx={21} cy={0} r={2} fill="#101820" opacity={0.4} style={{ filter: "blur(1px)" }} />
    </g>
  );
});

HumanoidMouth.displayName = "HumanoidMouth";

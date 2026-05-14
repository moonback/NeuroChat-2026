/**
 * RobotMouth - Premium oscilloscope visualizer with organic motion
 */

import React from "react";
import { getBarPhaseOffset } from "./RobotAvatar.utils";
import type { RobotStatus } from "./RobotAvatar.types";

interface RobotMouthProps {
  status: RobotStatus;
  isSpeaking: boolean;
  mouthColor: string;
  audioReactivity: number;
  time: number;
}

interface BarConfig {
  x: number;
  baseHeight: number;
  width: number;
}

const BAR_CONFIGS: BarConfig[] = [
  { x: -28, baseHeight: 18, width: 3.5 },
  { x: -20, baseHeight: 24, width: 3.5 },
  { x: -12, baseHeight: 32, width: 4 },
  { x: -4, baseHeight: 36, width: 4 },
  { x: 4, baseHeight: 32, width: 4 },
  { x: 12, baseHeight: 24, width: 3.5 },
  { x: 20, baseHeight: 18, width: 3.5 },
];

export const RobotMouth = React.memo<RobotMouthProps>(({
  status,
  isSpeaking,
  mouthColor,
  audioReactivity,
  time,
}) => {
  const bars = BAR_CONFIGS.map((config, i) => {
    const phaseOffset = getBarPhaseOffset(i, 42);
    let intensity: number;
    let barOpacity: number;

    if (isSpeaking || status === "speaking") {
      // Speaking: strong, fast oscillation
      const wave = Math.abs(Math.sin(time * 0.006 + phaseOffset));
      intensity = 0.35 + wave * 0.65;
      barOpacity = 0.7 + wave * 0.3;
    } else if (status === "listening") {
      // Listening: audio-reactive
      const wave = Math.abs(Math.sin(time * 0.004 + phaseOffset));
      intensity = 0.2 + audioReactivity * 0.8 * wave;
      barOpacity = 0.5 + audioReactivity * 0.5;
    } else if (status === "thinking") {
      // Thinking: slow, contemplative pulse
      const wave = Math.abs(Math.sin(time * 0.002 + phaseOffset));
      intensity = 0.15 + wave * 0.25;
      barOpacity = 0.4 + wave * 0.2;
    } else if (status === "muted") {
      // Muted: minimal activity
      intensity = 0.1;
      barOpacity = 0.25;
    } else if (status === "error") {
      // Error: erratic glitch pattern
      const glitch = Math.sin(time * 0.015 + phaseOffset) > 0.6 ? 1 : 0.2;
      intensity = 0.2 + glitch * 0.5;
      barOpacity = 0.4 + glitch * 0.4;
    } else {
      // Idle: subtle breathing
      const wave = Math.abs(Math.sin(time * 0.001 + phaseOffset));
      intensity = 0.15 + wave * 0.1;
      barOpacity = 0.35;
    }

    const height = config.baseHeight * intensity;
    
    return {
      x: config.x,
      y: -height / 2,
      width: config.width,
      height,
      opacity: barOpacity,
    };
  });

  return (
    <g transform="translate(100, 120)">
      <defs>
        {/* Bar gradient for depth */}
        <linearGradient id="robot-mouth-bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={mouthColor} stopOpacity="0.9" />
          <stop offset="50%" stopColor={mouthColor} stopOpacity="1" />
          <stop offset="100%" stopColor={mouthColor} stopOpacity="0.7" />
        </linearGradient>

        {/* Glow filter for bars */}
        <filter id="robot-mouth-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Mouth container background */}
      <rect
        x={-35}
        y={-22}
        width={70}
        height={44}
        rx={6}
        fill="#0a0f1e"
        opacity={0.3}
      />

      {/* Render bars with glow */}
      {bars.map((bar, i) => (
        <g key={i}>
          {/* Outer glow */}
          <rect
            x={bar.x - bar.width / 2}
            y={bar.y - 2}
            width={bar.width}
            height={bar.height + 4}
            rx={bar.width / 2}
            fill={mouthColor}
            opacity={bar.opacity * 0.3}
            style={{ filter: "blur(3px)" }}
          />
          
          {/* Main bar */}
          <rect
            x={bar.x - bar.width / 2}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={bar.width / 2}
            fill="url(#robot-mouth-bar-gradient)"
            opacity={bar.opacity}
          />
          
          {/* Inner highlight */}
          <rect
            x={bar.x - bar.width / 2 + 0.5}
            y={bar.y + 2}
            width={bar.width - 1}
            height={Math.max(0, bar.height * 0.3)}
            rx={bar.width / 2}
            fill="white"
            opacity={0.2}
          />
        </g>
      ))}

      {/* Waveform connection lines (subtle) */}
      {status === "speaking" || isSpeaking ? (
        <path
          d={`M ${bars[0].x} ${bars[0].y + bars[0].height / 2} ${bars
            .map((bar) => `L ${bar.x} ${bar.y + bar.height / 2}`)
            .join(" ")}`}
          stroke={mouthColor}
          strokeWidth="1"
          fill="none"
          opacity={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  );
});

RobotMouth.displayName = "RobotMouth";

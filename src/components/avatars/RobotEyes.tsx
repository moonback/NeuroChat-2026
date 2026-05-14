/**
 * RobotEyes - Intelligent LED eyes with dynamic glow and micro-movements
 */

import React from "react";
import type { RobotStatus } from "./RobotAvatar.types";

interface RobotEyesProps {
  status: RobotStatus;
  eyeColor: string;
  accentGlow: string;
  blinking: boolean;
  eyeOffsetX: number;
  eyeOffsetY: number;
  audioReactivity: number;
  time: number;
}

export const RobotEyes = React.memo<RobotEyesProps>(({
  status,
  eyeColor,
  accentGlow,
  blinking,
  eyeOffsetX,
  eyeOffsetY,
  audioReactivity,
  time,
}) => {
  const eyeScaleY = blinking ? 0.08 : 1;
  const eyeGlow = 0.7 + audioReactivity * 0.3;
  
  // Thinking mode: horizontal scanning
  const thinkingScanX = status === "thinking" ? Math.sin(time * 0.003) * 8 : 0;
  
  // Connecting mode: pulsing width animation
  const connectingWidth1 = status === "connecting" ? 20 + Math.sin(time * 0.004) * 6 : 22;
  const connectingWidth2 = status === "connecting" ? 20 + Math.cos(time * 0.004) * 6 : 22;
  
  // Error mode: glitch flicker
  const errorFlicker = status === "error" && Math.sin(time * 0.02) > 0.7 ? 0.3 : 1;
  
  // Muted mode: dim low-power state
  const mutedDim = status === "muted" ? 0.4 : 1;
  
  // Subtle pupil dilation
  const pupilDilation = 1 + audioReactivity * 0.15;

  return (
    <g transform={`translate(100, 90)`}>
      <defs>
        {/* Eye gradient with dynamic glow */}
        <linearGradient id="robot-eye-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={eyeColor} stopOpacity={0.95} />
          <stop offset="100%" stopColor={accentGlow} stopOpacity={0.4} />
        </linearGradient>

        {/* Eye glow filter */}
        <filter id="robot-eye-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glass reflection */}
        <radialGradient id="robot-eye-glass" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="50%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {status === "connecting" ? (
        // Connecting mode: animated horizontal bars
        <g opacity={errorFlicker * mutedDim}>
          {/* Left eye bar */}
          <g>
            <rect
              x={-38}
              y={-3}
              width={connectingWidth1}
              height={6}
              rx={3}
              fill={eyeColor}
              opacity={0.3}
              style={{ filter: "blur(3px)" }}
            />
            <rect
              x={-38}
              y={-2}
              width={connectingWidth1}
              height={4}
              rx={2}
              fill="url(#robot-eye-gradient)"
              opacity={0.9}
            />
          </g>
          
          {/* Right eye bar */}
          <g>
            <rect
              x={18}
              y={-3}
              width={connectingWidth2}
              height={6}
              rx={3}
              fill={eyeColor}
              opacity={0.3}
              style={{ filter: "blur(3px)" }}
            />
            <rect
              x={18}
              y={-2}
              width={connectingWidth2}
              height={4}
              rx={2}
              fill="url(#robot-eye-gradient)"
              opacity={0.9}
            />
          </g>
        </g>
      ) : (
        // Normal mode: LED eyes with glass effect
        <g
          transform={`scale(1, ${eyeScaleY})`}
          opacity={errorFlicker * mutedDim}
        >
          {/* Left eye assembly */}
          <g transform={`translate(${eyeOffsetX + thinkingScanX}, ${eyeOffsetY})`}>
            {/* Outer glow */}
            <rect
              x={-36}
              y={-11}
              width={20}
              height={20}
              rx={5}
              fill={eyeColor}
              opacity={0.2 * eyeGlow}
              style={{ filter: "blur(4px)" }}
            />
            
            {/* Main eye body */}
            <rect
              x={-34}
              y={-9}
              width={16}
              height={16}
              rx={4}
              fill="url(#robot-eye-gradient)"
              opacity={eyeGlow}
            />
            
            {/* Inner pupil with dilation */}
            <rect
              x={-32}
              y={-7}
              width={12 * pupilDilation}
              height={12 * pupilDilation}
              rx={3}
              fill={eyeColor}
              opacity={0.8}
              transform={`translate(${-26 + 6 * (1 - pupilDilation)}, ${-1 + 6 * (1 - pupilDilation)})`}
            />
            
            {/* Glass highlight (top) */}
            <rect
              x={-30}
              y={-6}
              width={7}
              height={5}
              rx={1.5}
              fill="white"
              opacity={0.5}
            />
            
            {/* Glass reflection (bottom) */}
            <circle
              cx={-26}
              cy={2}
              r={3.5}
              fill="url(#robot-eye-glass)"
              opacity={0.3}
            />
            
            {/* Specular highlight */}
            <circle
              cx={-29}
              cy={-4}
              r={1.5}
              fill="white"
              opacity={0.8}
            />
          </g>

          {/* Right eye assembly (mirrored) */}
          <g transform={`translate(${-eyeOffsetX - thinkingScanX}, ${eyeOffsetY})`}>
            {/* Outer glow */}
            <rect
              x={16}
              y={-11}
              width={20}
              height={20}
              rx={5}
              fill={eyeColor}
              opacity={0.2 * eyeGlow}
              style={{ filter: "blur(4px)" }}
            />
            
            {/* Main eye body */}
            <rect
              x={18}
              y={-9}
              width={16}
              height={16}
              rx={4}
              fill="url(#robot-eye-gradient)"
              opacity={eyeGlow}
            />
            
            {/* Inner pupil with dilation */}
            <rect
              x={20}
              y={-7}
              width={12 * pupilDilation}
              height={12 * pupilDilation}
              rx={3}
              fill={eyeColor}
              opacity={0.8}
              transform={`translate(${26 - 6 * (1 - pupilDilation)}, ${-1 + 6 * (1 - pupilDilation)})`}
            />
            
            {/* Glass highlight (top) */}
            <rect
              x={23}
              y={-6}
              width={7}
              height={5}
              rx={1.5}
              fill="white"
              opacity={0.5}
            />
            
            {/* Glass reflection (bottom) */}
            <circle
              cx={26}
              cy={2}
              r={3.5}
              fill="url(#robot-eye-glass)"
              opacity={0.3}
            />
            
            {/* Specular highlight */}
            <circle
              cx={29}
              cy={-4}
              r={1.5}
              fill="white"
              opacity={0.8}
            />
          </g>
        </g>
      )}
    </g>
  );
});

RobotEyes.displayName = "RobotEyes";

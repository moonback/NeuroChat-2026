/**
 * RobotEffects - Cinematic post-processing effects (glitch, chromatic aberration, etc.)
 */

import React from "react";

interface RobotEffectsProps {
  status: string;
  glitchActive: boolean;
  glitchOffsetX: number;
  glitchOffsetY: number;
  chromaticIntensity: number;
}

export const RobotEffects = React.memo<RobotEffectsProps>(({
  status,
  glitchActive,
  glitchOffsetX,
  glitchOffsetY,
  chromaticIntensity,
}) => {
  if (!glitchActive || status !== "error") {
    return null;
  }

  return (
    <g opacity={0.6}>
      <defs>
        {/* Chromatic aberration simulation */}
        <filter id="robot-chromatic">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx={chromaticIntensity} dy="0" result="redOffset" />
          
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
            result="blue"
          />
          <feOffset in="blue" dx={-chromaticIntensity} dy="0" result="blueOffset" />
          
          <feBlend mode="screen" in="redOffset" in2="blueOffset" result="combined" />
          <feBlend mode="screen" in="combined" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* Glitch displacement bars */}
      <rect
        x={50 + glitchOffsetX}
        y={70 + glitchOffsetY}
        width="100"
        height="3"
        fill="#ff0000"
        opacity={0.3}
        style={{ mixBlendMode: "screen" }}
      />
      
      <rect
        x={50 - glitchOffsetX}
        y={95 + glitchOffsetY}
        width="100"
        height="2"
        fill="#00ffff"
        opacity={0.25}
        style={{ mixBlendMode: "screen" }}
      />
      
      <rect
        x={50 + glitchOffsetX * 0.5}
        y={120 + glitchOffsetY}
        width="100"
        height="4"
        fill="#00ff00"
        opacity={0.2}
        style={{ mixBlendMode: "screen" }}
      />
    </g>
  );
});

RobotEffects.displayName = "RobotEffects";

import React from "react";
import type { RobotStatus } from "./RobotAvatar.types";

interface RobotEffectsProps {
  status: RobotStatus;
  glitchActive: boolean;
  glitchOffsetX: number;
  glitchOffsetY: number;
  chromaticIntensity: number;
}

export const RobotEffects: React.FC<RobotEffectsProps> = React.memo(({
  status,
  glitchActive,
  glitchOffsetX,
  glitchOffsetY,
  chromaticIntensity
}) => {
  if (!glitchActive && status !== "error") return null;

  return (
    <g style={{ pointerEvents: "none" }}>
      {/* Chromatic aberration and glitch effects */}
      {glitchActive && (
        <g transform={`translate(${glitchOffsetX}, ${glitchOffsetY})`}>
          <rect
            width="200"
            height="200"
            fill="rgba(255, 0, 0, 0.1)"
            style={{ mixBlendMode: "color-dodge", transform: `translate(${chromaticIntensity}px, 0)` }}
          />
          <rect
            width="200"
            height="200"
            fill="rgba(0, 255, 255, 0.1)"
            style={{ mixBlendMode: "color-dodge", transform: `translate(-${chromaticIntensity}px, 0)` }}
          />
        </g>
      )}
    </g>
  );
});

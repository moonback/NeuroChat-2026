/**
 * RobotAntenna - Reactive antenna with layered bloom and energy ripples
 */

import React from "react";

interface RobotAntennaProps {
  accentColor: string;
  accentGlow: string;
  pulseIntensity: number;
  rotationAngle: number;
  time: number;
}

export const RobotAntenna = React.memo<RobotAntennaProps>(({
  accentColor,
  accentGlow,
  pulseIntensity,
  rotationAngle,
  time,
}) => {
  const ledRadius = 4.5 + pulseIntensity * 3;
  const glowRadius = ledRadius * 2.5;
  const rippleRadius = ledRadius * 3.5;
  
  // Energy ripple animation
  const ripplePhase = (time * 0.003) % 1;
  const rippleOpacity = (1 - ripplePhase) * 0.4 * pulseIntensity;

  return (
    <g transform={`translate(100, 35) rotate(${rotationAngle})`}>
      <defs>
        {/* Antenna LED gradient */}
        <radialGradient id="robot-antenna-led" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="1" />
          <stop offset="70%" stopColor={accentGlow} stopOpacity="0.8" />
          <stop offset="100%" stopColor={accentGlow} stopOpacity="0.3" />
        </radialGradient>

        {/* Bloom gradient */}
        <radialGradient id="robot-antenna-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.6" />
          <stop offset="50%" stopColor={accentGlow} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accentGlow} stopOpacity="0" />
        </radialGradient>

        {/* Antenna stem gradient */}
        <linearGradient id="robot-antenna-stem" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Antenna stem */}
      <g>
        {/* Shadow */}
        <rect x="98.5" y="11" width="4" height="28" rx="2" fill="black" opacity={0.3} />
        
        {/* Main stem */}
        <rect x="98" y="10" width="4" height="28" rx="2" fill="url(#robot-antenna-stem)" />
        
        {/* Highlight */}
        <rect x="98.5" y="11" width="1.5" height="24" rx="0.75" fill="white" opacity={0.15} />
        
        {/* Energy flow (animated) */}
        <rect
          x="98.5"
          y={10 + (1 - ripplePhase) * 28}
          width="3"
          height="4"
          rx="1.5"
          fill={accentColor}
          opacity={rippleOpacity * 0.8}
          style={{ filter: "blur(1px)" }}
        />
      </g>

      {/* LED assembly at tip */}
      <g transform="translate(0, -25)">
        {/* Outer energy ripple */}
        <circle
          cx="100"
          cy="35"
          r={rippleRadius * (0.5 + ripplePhase * 0.5)}
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          opacity={rippleOpacity}
          style={{ filter: "blur(2px)" }}
        />

        {/* Secondary ripple */}
        <circle
          cx="100"
          cy="35"
          r={rippleRadius * 0.7 * (0.5 + ripplePhase * 0.5)}
          fill="none"
          stroke={accentGlow}
          strokeWidth="1.5"
          opacity={rippleOpacity * 0.6}
          style={{ filter: "blur(1px)" }}
        />

        {/* Layered bloom (multiple layers for depth) */}
        <circle
          cx="100"
          cy="35"
          r={glowRadius * 1.2}
          fill="url(#robot-antenna-bloom)"
          opacity={0.4 * pulseIntensity}
          style={{ filter: "blur(6px)" }}
        />
        
        <circle
          cx="100"
          cy="35"
          r={glowRadius}
          fill="url(#robot-antenna-bloom)"
          opacity={0.6 * pulseIntensity}
          style={{ filter: "blur(4px)" }}
        />
        
        <circle
          cx="100"
          cy="35"
          r={glowRadius * 0.7}
          fill={accentColor}
          opacity={0.3 * pulseIntensity}
          style={{ filter: "blur(3px)" }}
        />

        {/* Main LED body */}
        <circle
          cx="100"
          cy="35"
          r={ledRadius}
          fill="url(#robot-antenna-led)"
          opacity={0.9}
        />

        {/* LED core (brightest point) */}
        <circle
          cx="100"
          cy="35"
          r={ledRadius * 0.5}
          fill={accentColor}
          opacity={0.9}
        />

        {/* Glass specular highlight */}
        <circle
          cx="99"
          cy="34"
          r={ledRadius * 0.35}
          fill="white"
          opacity={0.7}
        />

        {/* Secondary highlight */}
        <circle
          cx="101"
          cy="36"
          r={ledRadius * 0.2}
          fill="white"
          opacity={0.4}
        />
      </g>
    </g>
  );
});

RobotAntenna.displayName = "RobotAntenna";

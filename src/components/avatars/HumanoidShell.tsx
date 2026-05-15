/**
 * HumanoidShell - Organic silver humanoid face (replaces RobotShell)
 * 
 * Enhanced with Subsurface Scattering (SSS) simulation, micro-textures, 
 * and deep cinematic lighting.
 */

import React from "react";

interface HumanoidShellProps {
  accentColor: string;
  glowIntensity: number;
  breathScale: number;
  breathOffsetY: number;
}

export const HumanoidShell = React.memo<HumanoidShellProps>(({
  accentColor,
  glowIntensity,
  breathScale,
  breathOffsetY,
}) => {
  return (
    <g transform={`translate(0, ${breathOffsetY}) scale(${breathScale}) translate(0, ${-breathOffsetY / breathScale})`}>
      <defs>
        {/* Procedural Skin Micro-texture (softer for human skin) */}
        <filter id="h-texture" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.05 0" in="noise" result="coloredNoise" />
          <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture" />
          <feBlend mode="multiply" in="texture" in2="SourceGraphic" />
        </filter>

        {/* Main face gradient - Human Flesh Tones with SSS */}
        <radialGradient id="h-face-grad" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffd8c4" />    {/* Lightest skin tone */}
          <stop offset="30%" stopColor="#e5b299" />   {/* Mid skin tone */}
          <stop offset="65%" stopColor="#cc9076" />   {/* Shadow skin tone */}
          <stop offset="88%" stopColor="#a55d48" />   {/* Deep warm SSS edge */}
          <stop offset="100%" stopColor="#633226" />  {/* Deepest shadow */}
        </radialGradient>

        {/* Head top highlight - Warmer */}
        <radialGradient id="h-head-top" cx="45%" cy="15%" r="75%">
          <stop offset="0%" stopColor="#fff0e8" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#f2cca3" stopOpacity="0.6" />
          <stop offset="85%" stopColor="#c47458" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#854636" stopOpacity="0.1" />
        </radialGradient>

        {/* Neck gradient with deep ambient occlusion */}
        <linearGradient id="h-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3d1d16" /> {/* Deep shadow under chin */}
          <stop offset="20%" stopColor="#a86e58" />
          <stop offset="70%" stopColor="#875340" />
          <stop offset="100%" stopColor="#4a271d" />
        </linearGradient>

        {/* Cinematic Rim Light - Warmer */}
        <radialGradient id="h-rim-light" cx="80%" cy="20%" r="80%">
          <stop offset="80%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffd8b3" stopOpacity="0.5" />
        </radialGradient>

        {/* Nose tip specular */}
        <radialGradient id="h-nose-tip" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#fce1cc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#b37c66" stopOpacity="0" />
        </radialGradient>

        <filter id="h-soft">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="h-glow">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="h-edge">
          <feGaussianBlur stdDeviation="1" />
        </filter>

        <clipPath id="h-face-clip">
          <ellipse cx="100" cy="105" rx="77" ry="95" />
        </clipPath>
      </defs>

      {/* Ground shadow (Ambient occlusion drop) */}
      <ellipse cx="100" cy="194" rx="60" ry="8" fill="#000000" opacity={0.3} style={{ filter: "blur(6px)" }} />
      <ellipse cx="100" cy="192" rx="40" ry="4" fill="#000000" opacity={0.5} style={{ filter: "blur(3px)" }} />

      {/* Neck */}
      <path
        d="M 65 155 Q 70 190 85 200 Q 100 205 115 200 Q 130 190 135 155"
        fill="url(#h-neck)"
        opacity={0.95}
      />
      {/* Neck texture layer */}
      <path
        d="M 65 155 Q 70 190 85 200 Q 100 205 115 200 Q 130 190 135 155"
        fill="url(#h-neck)"
        opacity={0.5}
        filter="url(#h-texture)"
      />

      {/* Realistic human face shape path */}
      {/* Outer Head Shell */}
      <g filter="url(#h-texture)">
        <path
          d="M 100 10 C 145 10, 175 35, 175 90 C 175 130, 155 165, 130 185 C 115 195, 85 195, 70 185 C 45 165, 25 130, 25 90 C 25 35, 55 10, 100 10 Z"
          fill="url(#h-head-top)" opacity={0.98}
        />
      </g>

      {/* Face surface (front-facing plane) */}
      <g filter="url(#h-texture)">
        <path
          d="M 100 15 C 140 15, 165 40, 165 95 C 165 130, 145 160, 125 180 C 110 190, 90 190, 75 180 C 55 160, 35 130, 35 95 C 35 40, 60 15, 100 15 Z"
          fill="url(#h-face-grad)" opacity={0.95}
        />
      </g>

      {/* Subsurface Scattering edge glow */}
      <path
        d="M 100 15 C 140 15, 165 40, 165 95 C 165 130, 145 160, 125 180 C 110 190, 90 190, 75 180 C 55 160, 35 130, 35 95 C 35 40, 60 15, 100 15 Z"
        fill="none" stroke="#ff8c6b" strokeWidth={4} opacity={0.15} style={{ filter: "blur(4px)" }}
      />

      {/* Rim light (cinematic backlighting) */}
      <path
        d="M 100 10 C 145 10, 175 35, 175 90 C 175 130, 155 165, 130 185 C 115 195, 85 195, 70 185 C 45 165, 25 130, 25 90 C 25 35, 55 10, 100 10 Z"
        fill="url(#h-rim-light)"
      />

      {/* Forehead structure lines (Softer, less robotic) */}
      <path d="M 80 60 Q 100 55 120 60" fill="none" stroke="#ffe0d1" strokeWidth={0.8} opacity={0.2} />
      <path d="M 85 68 Q 100 64 115 68" fill="none" stroke="#ffebcc" strokeWidth={0.6} opacity={0.15} />

      {/* Specular Cheekbone highlights (Very soft for realism, no more clown cheeks) */}
      <ellipse cx="65" cy="120" rx="25" ry="15" fill="#ffffff" opacity={0.08} style={{ filter: "blur(6px)" }} />
      <ellipse cx="135" cy="120" rx="25" ry="15" fill="#ffffff" opacity={0.08} style={{ filter: "blur(6px)" }} />

      {/* Sharp Top highlight (Forehead reflection) */}
      <ellipse cx="90" cy="50" rx="25" ry="15" fill="white" opacity={0.15} style={{ filter: "blur(6px)" }} />
      <ellipse cx="85" cy="45" rx="10" ry="6" fill="white" opacity={0.25} style={{ filter: "blur(3px)" }} />

      {/* Nose bridge and deep shadows (Softer, organic transition) */}
      <path
        d="M 94 92 Q 90 110 88 120 Q 95 128 100 130 Q 105 128 112 120 Q 110 110 106 92"
        fill="#8c4738" opacity={0.1}
        style={{ filter: "blur(3px)" }}
      />
      <path
        d="M 95 95 Q 92 110 90 120 Q 95 125 100 126 Q 105 125 110 120 Q 108 110 105 95"
        fill="#cc9076" opacity={0.15}
        style={{ filter: "blur(1px)" }}
      />
      
      {/* Nose tip specular (Softer, no harsh dot) */}
      <ellipse cx="100" cy="122" rx="9" ry="6" fill="#ffffff" opacity={0.2} style={{ filter: "blur(2px)" }} />
      <ellipse cx="98" cy="120" rx="3" ry="1.5" fill="white" opacity={0.3} style={{ filter: "blur(1px)" }} />

      {/* Jaw definition with ambient occlusion */}
      <path
        d="M 35 118 Q 40 155 60 170 Q 80 182 100 184 Q 120 182 140 170 Q 160 155 165 118"
        fill="none" stroke="#4a271d" strokeWidth={4} opacity={0.15} style={{ filter: "blur(4px)" }}
      />
      <path
        d="M 35 118 Q 40 155 60 170 Q 80 182 100 184 Q 120 182 140 170 Q 160 155 165 118"
        fill="none" stroke="#e5b299" strokeWidth={1} opacity={0.2}
      />

      {/* Realistic Human Ears (Left & Right) */}
      <g filter="url(#h-texture)">
        {/* Left Ear */}
        <path
          d="M 28 95 C 18 90, 12 105, 15 115 C 17 125, 22 130, 30 125 Z"
          fill="url(#h-head-top)"
        />
        <path
          d="M 28 95 C 18 90, 12 105, 15 115 C 17 125, 22 130, 30 125 Z"
          fill="none" stroke="#a55d48" strokeWidth={2} opacity={0.4} style={{ filter: "blur(1px)" }}
        />
        {/* Inner ear shadow left */}
        <path
          d="M 25 100 C 18 100, 18 115, 25 115"
          fill="none" stroke="#633226" strokeWidth={2} opacity={0.5} style={{ filter: "blur(1px)" }}
        />

        {/* Right Ear */}
        <path
          d="M 172 95 C 182 90, 188 105, 185 115 C 183 125, 178 130, 170 125 Z"
          fill="url(#h-head-top)"
        />
        <path
          d="M 172 95 C 182 90, 188 105, 185 115 C 183 125, 178 130, 170 125 Z"
          fill="none" stroke="#a55d48" strokeWidth={2} opacity={0.4} style={{ filter: "blur(1px)" }}
        />
        {/* Inner ear shadow right */}
        <path
          d="M 175 100 C 182 100, 182 115, 175 115"
          fill="none" stroke="#633226" strokeWidth={2} opacity={0.5} style={{ filter: "blur(1px)" }}
        />
      </g>

      {/* Accent edge glow (Audio reactive) */}
      <ellipse
        cx="100" cy="100"
        rx="78" ry="93"
        fill="none"
        stroke={accentColor}
        strokeWidth={1.5}
        opacity={0.25 * glowIntensity}
        style={{ filter: "blur(2px)" }}
      />
      <ellipse
        cx="100" cy="100"
        rx="78" ry="93"
        fill="none"
        stroke={accentColor}
        strokeWidth={4}
        opacity={0.1 * glowIntensity}
        style={{ filter: "blur(8px)" }}
      />
    </g>
  );
});

HumanoidShell.displayName = "HumanoidShell";


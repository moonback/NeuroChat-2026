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
        d="M 72 165 Q 76 185 83 192 Q 100 198 117 192 Q 124 185 128 165"
        fill="url(#h-neck)"
        opacity={0.95}
      />
      {/* Neck texture layer */}
      <path
        d="M 72 165 Q 76 185 83 192 Q 100 198 117 192 Q 124 185 128 165"
        fill="url(#h-neck)"
        opacity={0.5}
        filter="url(#h-texture)"
      />

      {/* Head outer shell with texture */}
      <g filter="url(#h-texture)">
        <ellipse cx="100" cy="100" rx="78" ry="93" fill="url(#h-head-top)" opacity={0.98} />
      </g>

      {/* Face surface (front-facing plane) with texture */}
      <g filter="url(#h-texture)">
        <ellipse cx="100" cy="105" rx="68" ry="84" fill="url(#h-face-grad)" opacity={0.95} />
      </g>

      {/* Subsurface Scattering edge glow (simulates light passing through skin/shell) */}
      <ellipse cx="100" cy="105" rx="68" ry="84" fill="none" stroke="#ff8c6b" strokeWidth={3} opacity={0.15} style={{ filter: "blur(4px)" }} />

      {/* Rim light (cinematic backlighting) */}
      <ellipse cx="100" cy="100" rx="78" ry="93" fill="url(#h-rim-light)" />

      {/* Forehead structure lines */}
      <path d="M 76 60 Q 100 52 124 60" fill="none" stroke="#ffe0d1" strokeWidth={0.8} opacity={0.35} />
      <path d="M 82 70 Q 100 64 118 70" fill="none" stroke="#ffebcc" strokeWidth={0.6} opacity={0.25} />
      {/* Inner groove shadows for lines */}
      <path d="M 76 61 Q 100 53 124 61" fill="none" stroke="#633226" strokeWidth={1} opacity={0.2} />

      {/* Specular Cheekbone highlights */}
      <ellipse cx="58" cy="118" rx="20" ry="12" fill="white" opacity={0.15} style={{ filter: "blur(4px)" }} />
      <ellipse cx="142" cy="118" rx="20" ry="12" fill="white" opacity={0.15} style={{ filter: "blur(4px)" }} />
      <ellipse cx="58" cy="116" rx="10" ry="6" fill="white" opacity={0.25} style={{ filter: "blur(2px)" }} />
      <ellipse cx="142" cy="116" rx="10" ry="6" fill="white" opacity={0.25} style={{ filter: "blur(2px)" }} />

      {/* Sharp Top highlight */}
      <ellipse cx="85" cy="62" rx="35" ry="22" fill="white" opacity={0.2} style={{ filter: "blur(5px)" }} />
      <ellipse cx="80" cy="55" rx="15" ry="8" fill="white" opacity={0.35} style={{ filter: "blur(2px)" }} />

      {/* Nose bridge and deep shadows */}
      <path
        d="M 94 88 Q 90 110 88 120 Q 95 128 100 130 Q 105 128 112 120 Q 110 110 106 88"
        fill="#8c4738" opacity={0.15}
        style={{ filter: "blur(2px)" }}
      />
      <path
        d="M 95 90 Q 92 110 90 120 Q 95 127 100 128 Q 105 127 110 120 Q 108 110 105 90"
        fill="#cc9076" opacity={0.25}
      />
      {/* Nose tip specular */}
      <ellipse cx="100" cy="123" rx="12" ry="8" fill="url(#h-nose-tip)" opacity={0.65} />
      <ellipse cx="96" cy="120" rx="4" ry="2.5" fill="white" opacity={0.4} />

      {/* Jaw definition with ambient occlusion */}
      <path
        d="M 28 118 Q 33 158 55 174 Q 78 186 100 188 Q 122 186 145 174 Q 167 158 172 118"
        fill="none" stroke="#4a271d" strokeWidth={3} opacity={0.2} style={{ filter: "blur(3px)" }}
      />
      <path
        d="M 28 118 Q 33 155 55 170 Q 78 182 100 184 Q 122 182 145 170 Q 167 155 172 118"
        fill="none" stroke="#e5b299" strokeWidth={1} opacity={0.3}
      />

      {/* Ear / side panel left - warmer metallic tone */}
      <g filter="url(#h-texture)">
        <ellipse cx="23" cy="108" rx="11" ry="26" fill="#a88574" opacity={0.9} />
      </g>
      <ellipse cx="23" cy="108" rx="11" ry="26" fill="none" stroke="#4a271d" strokeWidth={1.5} opacity={0.4} />
      <ellipse cx="23" cy="108" rx="5" ry="18" fill="#ffd8c4" opacity={0.3} />
      <ellipse cx="21" cy="102" rx="2" ry="4" fill="white" opacity={0.2} />

      {/* Ear / side panel right - warmer metallic tone */}
      <g filter="url(#h-texture)">
        <ellipse cx="177" cy="108" rx="11" ry="26" fill="#a88574" opacity={0.9} />
      </g>
      <ellipse cx="177" cy="108" rx="11" ry="26" fill="none" stroke="#4a271d" strokeWidth={1.5} opacity={0.4} />
      <ellipse cx="177" cy="108" rx="5" ry="18" fill="#ffd8c4" opacity={0.3} />
      <ellipse cx="179" cy="102" rx="2" ry="4" fill="white" opacity={0.2} />

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


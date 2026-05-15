/**
 * HumanoidShell - Organic silver humanoid face (replaces RobotShell)
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
        {/* Main face gradient - silver/pearl */}
        <radialGradient id="h-face-grad" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#dce8f2" />
          <stop offset="30%" stopColor="#b0c8dc" />
          <stop offset="65%" stopColor="#7fa0b8" />
          <stop offset="100%" stopColor="#4a6880" />
        </radialGradient>

        {/* Head top highlight */}
        <radialGradient id="h-head-top" cx="50%" cy="18%" r="72%">
          <stop offset="0%" stopColor="#eef4fa" stopOpacity="0.96" />
          <stop offset="45%" stopColor="#c0d8ec" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#6888a0" stopOpacity="0.3" />
        </radialGradient>

        {/* Neck gradient */}
        <linearGradient id="h-neck" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8fa8bc" />
          <stop offset="100%" stopColor="#507088" stopOpacity="0.15" />
        </linearGradient>

        {/* Cheek / temple subtle sheen */}
        <radialGradient id="h-cheek-sheen" cx="30%" cy="40%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Nose tip */}
        <radialGradient id="h-nose-tip" cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#d8e8f4" />
          <stop offset="100%" stopColor="#7888a0" />
        </radialGradient>

        {/* Lip gradient */}
        <linearGradient id="h-lip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b8d0e4" />
          <stop offset="100%" stopColor="#6888a4" />
        </linearGradient>

        {/* Ear panel */}
        <radialGradient id="h-ear" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#a8c0d4" />
          <stop offset="100%" stopColor="#608098" />
        </radialGradient>

        {/* Soft blur for sheen */}
        <filter id="h-soft">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        {/* Edge softness for face */}
        <filter id="h-edge">
          <feGaussianBlur stdDeviation="1" />
        </filter>

        {/* Face clip */}
        <clipPath id="h-face-clip">
          <ellipse cx="100" cy="105" rx="77" ry="95" />
        </clipPath>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="192" rx="52" ry="6" fill="black" opacity={0.18} style={{ filter: "blur(5px)" }} />

      {/* Neck */}
      <path
        d="M 74 168 Q 78 185 83 192 Q 100 198 117 192 Q 122 185 126 168"
        fill="url(#h-neck)"
        opacity={0.75}
      />

      {/* Head outer shell (full ellipse) */}
      <ellipse cx="100" cy="100" rx="78" ry="93" fill="url(#h-head-top)" opacity={0.94} />

      {/* Face surface (front-facing plane) */}
      <ellipse cx="100" cy="105" rx="68" ry="84" fill="url(#h-face-grad)" opacity={0.90} />

      {/* Scan shimmer inside face */}
      <g clipPath="url(#h-face-clip)" opacity={0.05}>
        {Array.from({ length: 30 }, (_, i) => (
          <line
            key={i}
            x1="23" y1={22 + i * 5.8} x2="177" y2={22 + i * 5.8}
            stroke="#a0c8e8" strokeWidth={0.5}
          />
        ))}
      </g>

      {/* Forehead panel lines */}
      <path d="M 78 62 Q 100 56 122 62" fill="none" stroke="#d0e8f8" strokeWidth={0.8} opacity={0.35} />
      <path d="M 84 72 Q 100 68 116 72" fill="none" stroke="#c0d8f0" strokeWidth={0.6} opacity={0.22} />

      {/* Cheekbone sheen left */}
      <ellipse cx="62" cy="118" rx="22" ry="14" fill="white" opacity={0.14} style={{ filter: "blur(4px)" }} />
      {/* Cheekbone sheen right */}
      <ellipse cx="138" cy="118" rx="22" ry="14" fill="white" opacity={0.14} style={{ filter: "blur(4px)" }} />

      {/* Top highlight */}
      <ellipse cx="88" cy="65" rx="38" ry="26" fill="white" opacity={0.18} style={{ filter: "blur(5px)" }} />

      {/* Nose bridge */}
      <path
        d="M 94 90 Q 91 110 89 120 Q 95 128 100 129 Q 105 128 111 120 Q 109 110 106 90"
        fill="#7888a0" opacity={0.16}
      />
      {/* Nose tip */}
      <ellipse cx="100" cy="124" rx="11" ry="7" fill="url(#h-nose-tip)" opacity={0.6} />
      <ellipse cx="97" cy="121" rx="4" ry="3" fill="white" opacity={0.42} />

      {/* Nostrils (subtle) */}
      <ellipse cx="93" cy="126" rx="4" ry="2.5" fill="#4a6070" opacity={0.35} />
      <ellipse cx="107" cy="126" rx="4" ry="2.5" fill="#4a6070" opacity={0.35} />

      {/* Upper lip */}
      <path
        d="M 82 148 Q 90 143 97 146 Q 100 142 103 146 Q 110 143 118 148"
        fill="none" stroke="#8098b2" strokeWidth={1.8} strokeLinecap="round" opacity={0.85}
      />
      {/* Lower lip shape */}
      <path
        d="M 82 148 Q 100 160 118 148"
        fill="url(#h-lip)" opacity={0.30}
      />
      <path
        d="M 84 150 Q 100 158 116 150"
        fill="none" stroke="#b0c8dc" strokeWidth={1.1} strokeLinecap="round" opacity={0.5}
      />
      {/* Mouth center line */}
      <path
        d="M 85 148 Q 100 150 115 148"
        fill="none" stroke="#5878a0" strokeWidth={0.9} strokeLinecap="round" opacity={0.55}
      />
      {/* Lip highlight */}
      <ellipse cx="100" cy="153" rx="14" ry="4" fill="white" opacity={0.14} />

      {/* Chin cleft */}
      <path d="M 96 170 Q 100 174 104 170" fill="none" stroke="#8898ac" strokeWidth={0.9} strokeLinecap="round" opacity={0.4} />

      {/* Jaw definition */}
      <path
        d="M 28 118 Q 33 155 55 170 Q 78 182 100 184 Q 122 182 145 170 Q 167 155 172 118"
        fill="none" stroke="#7090a8" strokeWidth={0.8} opacity={0.28}
      />

      {/* Ear / side panel left */}
      <ellipse cx="24" cy="108" rx="12" ry="24" fill="url(#h-ear)" opacity={0.5} />
      <ellipse cx="24" cy="108" rx="6.5" ry="16" fill="#b8d0e4" opacity={0.3} />
      <ellipse cx="22" cy="102" rx="2" ry="4" fill="white" opacity={0.18} />

      {/* Ear / side panel right */}
      <ellipse cx="176" cy="108" rx="12" ry="24" fill="url(#h-ear)" opacity={0.5} />
      <ellipse cx="176" cy="108" rx="6.5" ry="16" fill="#b8d0e4" opacity={0.3} />
      <ellipse cx="178" cy="102" rx="2" ry="4" fill="white" opacity={0.18} />

      {/* Temporal side structure lines */}
      <path d="M 28 80 Q 26 100 28 118" fill="none" stroke="#8099b0" strokeWidth={0.8} opacity={0.3} />
      <path d="M 172 80 Q 174 100 172 118" fill="none" stroke="#8099b0" strokeWidth={0.8} opacity={0.3} />

      {/* Accent edge glow */}
      <ellipse
        cx="100" cy="100"
        rx="78" ry="93"
        fill="none"
        stroke={accentColor}
        strokeWidth={1}
        opacity={0.18 * glowIntensity}
        style={{ filter: "blur(1.5px)" }}
      />
    </g>
  );
});

HumanoidShell.displayName = "HumanoidShell";

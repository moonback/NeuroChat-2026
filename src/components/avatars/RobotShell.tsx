/**
 * RobotShell - Premium metallic body with procedural textures
 */

import React from "react";

interface RobotShellProps {
  accentColor: string;
  glowIntensity: number;
  breathScale: number;
  breathOffsetY: number;
}

export const RobotShell = React.memo<RobotShellProps>(({
  accentColor,
  glowIntensity,
  breathScale,
  breathOffsetY,
}) => {
  return (
    <g transform={`translate(0, ${breathOffsetY}) scale(${breathScale})`}>
      <defs>
        {/* Brushed metal gradient with multiple layers */}
        <linearGradient id="robot-metal-base" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8b5c7" />
          <stop offset="25%" stopColor="#8b98ab" />
          <stop offset="50%" stopColor="#6b7a8f" />
          <stop offset="75%" stopColor="#556575" />
          <stop offset="100%" stopColor="#3d4f5f" />
        </linearGradient>

        {/* Metallic highlight sweep */}
        <linearGradient id="robot-metal-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="30%" stopColor="white" stopOpacity="0.15" />
          <stop offset="50%" stopColor="white" stopOpacity="0.25" />
          <stop offset="70%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Ambient shadow */}
        <radialGradient id="robot-ambient-shadow" cx="50%" cy="80%" r="60%">
          <stop offset="0%" stopColor="black" stopOpacity="0" />
          <stop offset="70%" stopColor="black" stopOpacity="0.15" />
          <stop offset="100%" stopColor="black" stopOpacity="0.3" />
        </radialGradient>

        {/* Procedural noise pattern for texture */}
        <filter id="robot-metal-texture">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="42" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 0.02 0.04 0.02" />
          </feComponentTransfer>
          <feBlend mode="overlay" in="SourceGraphic" />
        </filter>

        {/* Bevel effect */}
        <filter id="robot-bevel">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset in="blur" dx="0" dy="-2" result="offsetBlur" />
          <feFlood floodColor="white" floodOpacity="0.3" />
          <feComposite in2="offsetBlur" operator="in" result="highlight" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="highlight" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow ellipse */}
      <ellipse
        cx="100"
        cy="185"
        rx="55"
        ry="8"
        fill="black"
        opacity={0.25}
        style={{ filter: "blur(4px)" }}
      />

      {/* Side mounting bolts */}
      <g opacity={0.9}>
        {/* Left bolt assembly */}
        <rect x="24" y="80" width="12" height="35" rx="6" fill="#3d4f5f" />
        <rect x="26" y="83" width="8" height="29" rx="4" fill="#556575" />
        <rect x="24" y="88" width="5" height="10" rx="2.5" fill="#2d3d4d" />
        <circle cx="29" cy="93" r="2" fill="#1a2530" />
        
        {/* Right bolt assembly */}
        <rect x="164" y="80" width="12" height="35" rx="6" fill="#3d4f5f" />
        <rect x="166" y="83" width="8" height="29" rx="4" fill="#556575" />
        <rect x="171" y="88" width="5" height="10" rx="2.5" fill="#2d3d4d" />
        <circle cx="171" cy="93" r="2" fill="#1a2530" />
      </g>

      {/* Main head shell with layered effects */}
      <g>
        {/* Base shell */}
        <rect
          x="35"
          y="35"
          width="130"
          height="130"
          rx="28"
          fill="url(#robot-metal-base)"
          filter="url(#robot-metal-texture)"
        />

        {/* Ambient shadow overlay */}
        <rect
          x="35"
          y="35"
          width="130"
          height="130"
          rx="28"
          fill="url(#robot-ambient-shadow)"
        />

        {/* Top bevel highlight */}
        <rect
          x="38"
          y="38"
          width="124"
          height="50"
          rx="24"
          fill="url(#robot-metal-highlight)"
          opacity={0.6}
        />

        {/* Subtle edge highlight */}
        <rect
          x="35"
          y="35"
          width="130"
          height="130"
          rx="28"
          fill="none"
          stroke="white"
          strokeWidth="1"
          opacity={0.1}
        />

        {/* Accent glow edge */}
        <rect
          x="35"
          y="35"
          width="130"
          height="130"
          rx="28"
          fill="none"
          stroke={accentColor}
          strokeWidth="0.5"
          opacity={0.2 * glowIntensity}
          style={{ filter: "blur(1px)" }}
        />
      </g>

      {/* Corner rivets with depth */}
      {[
        [44, 44],
        [156, 44],
        [44, 156],
        [156, 156],
      ].map(([cx, cy]) => (
        <g key={`rivet-${cx}-${cy}`}>
          {/* Shadow */}
          <circle cx={cx + 0.5} cy={cy + 0.5} r={3.5} fill="black" opacity={0.3} />
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={3.5} fill="#1e293b" />
          {/* Inner detail */}
          <circle cx={cx} cy={cy} r={2} fill="#334155" />
          {/* Highlight */}
          <circle cx={cx - 0.5} cy={cy - 0.5} r={1} fill="white" opacity={0.2} />
        </g>
      ))}

      {/* Top decorative arc */}
      <path
        d="M 50 40 Q 100 34 150 40"
        stroke="white"
        strokeWidth={1.5}
        opacity={0.15}
        fill="none"
        strokeLinecap="round"
      />

      {/* Bottom decorative arc */}
      <path
        d="M 55 165 Q 100 172 145 165"
        stroke="black"
        strokeWidth={1.5}
        opacity={0.25}
        fill="none"
        strokeLinecap="round"
      />

      {/* Serial number plate */}
      <g>
        <rect x="70" y="188" width="60" height="10" rx="2" fill="#1e293b" opacity={0.6} />
        <text
          x="100"
          y="195"
          textAnchor="middle"
          style={{
            font: "600 6px 'Courier New', monospace",
            fill: "#64748b",
            letterSpacing: "0.2em",
          }}
        >
          UNIT-001
        </text>
      </g>
    </g>
  );
});

RobotShell.displayName = "RobotShell";

import React, { useMemo } from "react";

interface HumanoidHairProps {
  time: number;
}

export const HumanoidHair = React.memo<HumanoidHairProps>(({ time }) => {
  /**
   * Natural secondary motion
   * Multiple frequencies = more realistic movement
   */
  const motion = useMemo(() => {
    const t = time * 0.001;

    return {
      swayX: Math.sin(t * 0.9) * 2.5,
      swayY: Math.cos(t * 1.2) * 1.5,

      microX: Math.sin(t * 3.5) * 0.4,
      microY: Math.cos(t * 2.8) * 0.3,

      strand1: Math.sin(t * 1.7) * 4,
      strand2: Math.cos(t * 1.3) * 3,

      breathing: Math.sin(t * 0.45) * 1.2,
    };
  }, [time]);

  const {
    swayX,
    swayY,
    microX,
    microY,
    strand1,
    strand2,
    breathing,
  } = motion;

  return (
    <g transform={`translate(${microX}, ${microY})`}>
      <defs>
        {/* Base Hair Gradient */}
        <linearGradient
          id="h-hair-base"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#3b2620" />
          <stop offset="35%" stopColor="#22120f" />
          <stop offset="70%" stopColor="#130909" />
          <stop offset="100%" stopColor="#050202" />
        </linearGradient>

        {/* Warm Specular Reflection */}
        <linearGradient
          id="h-hair-highlight"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#9b6b5e" stopOpacity="0" />
          <stop offset="45%" stopColor="#b98474" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2e1c18" stopOpacity="0" />
        </linearGradient>

        {/* Rim Light */}
        <linearGradient
          id="h-rim"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Hair Shadow */}
        <filter
          id="h-hair-shadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="5"
            stdDeviation="5"
            floodColor="#120806"
            floodOpacity="0.55"
          />
        </filter>

        {/* Soft Hair Texture */}
        <filter id="h-hair-texture">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.55"
            numOctaves="3"
            seed="7"
            result="noise"
          />

          <feColorMatrix
            in="noise"
            type="saturate"
            values="0"
            result="monoNoise"
          />

          <feComposite operator="in" in="monoNoise" in2="SourceGraphic" result="texturedNoise" />

          <feBlend
            mode="soft-light"
            in="texturedNoise"
            in2="SourceGraphic"
          />
        </filter>

        {/* Soft Blur */}
        <filter id="h-soft-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <g filter="url(#h-hair-shadow)">
        {/* ===================================================== */}
        {/* BASE MASS */}
        {/* ===================================================== */}

        <path
          d={`
            M 20 84
            C 18 30, 50 2, 100 2
            C 150 2, 182 30, 180 84
            C 172 82, 165 70, 160 55
            C 145 35, 120 32, 100 32
            C 80 32, 55 35, 40 55
            C 35 70, 28 82, 20 84 Z
          `}
          fill="url(#h-hair-base)"
          filter="url(#h-hair-texture)"
        />

        {/* ===================================================== */}
        {/* TOP VOLUME */}
        {/* ===================================================== */}

        <path
          d={`
            M 45 35
            C 75 -5, 145 5, 165 ${55 + breathing}
            C 150 35, 125 25, 85 25
            C 65 25, 50 30, 45 35 Z
          `}
          fill="url(#h-hair-base)"
        />

        {/* Crown Reflection */}
        <path
          d={`
            M 55 22
            C 85 10, 125 15, 145 35
            C 120 35, 85 30, 55 22 Z
          `}
          fill="url(#h-rim)"
          opacity="0.7"
        />

        {/* ===================================================== */}
        {/* BANGS */}
        {/* ===================================================== */}

        <g transform={`translate(${swayX * 0.4}, ${swayY * 0.5})`}>
          <path
            d={`
              M 65 30
              C 100 30, 125 40, 145 ${65 + swayY}
              C 125 ${55 + swayY},
                100 45,
                65 30 Z
            `}
            fill="url(#h-hair-base)"
            filter="url(#h-hair-texture)"
          />

          <path
            d={`
              M 75 32
              C 105 35, 130 50, 135 ${72 + swayY}
              C 115 ${58 + swayY},
                95 45,
                75 32 Z
            `}
            fill="url(#h-hair-base)"
          />

          {/* Highlight pass */}
          <path
            d={`
              M 70 30
              C 95 32, 115 45, 130 ${62 + swayY}
              C 110 50, 90 40, 70 30 Z
            `}
            fill="url(#h-hair-highlight)"
            opacity="0.75"
          />
        </g>

        {/* ===================================================== */}
        {/* LEFT SIDE */}
        {/* ===================================================== */}

        <g transform={`translate(${swayX * 0.2}, ${swayY * 0.3})`}>
          <path
            d={`
              M 45 35
              C 35 40, 25 55, 25 ${75 + swayY}
              C 30 60, 38 45, 45 35 Z
            `}
            fill="url(#h-hair-base)"
          />

          <path
            d={`
              M 40 40
              C 32 45, 28 55, 28 ${65 + swayY}
              C 32 55, 38 45, 40 40 Z
            `}
            fill="url(#h-hair-highlight)"
            opacity="0.35"
          />
        </g>

        {/* ===================================================== */}
        {/* INDIVIDUAL STRANDS */}
        {/* ===================================================== */}

        <g opacity="0.9">
          <path
            d={`
              M 80 25
              Q ${110 + strand1} 35
                ${120 + strand1 * 1.4} ${65 + swayY}
            `}
            fill="none"
            stroke="url(#h-hair-highlight)"
            strokeWidth={2.4}
            strokeLinecap="round"
          />

          <path
            d={`
              M 95 28
              Q ${125 + strand2} 35
                ${135 + strand2 * 1.2} ${60 + swayY}
            `}
            fill="none"
            stroke="url(#h-hair-highlight)"
            strokeWidth={1.9}
            strokeLinecap="round"
            opacity="0.75"
          />

          <path
            d={`
              M 45 35
              Q ${35 + strand2 * 0.5} 45
                ${35 + strand2 * 0.3} ${60 + swayY}
            `}
            fill="none"
            stroke="url(#h-hair-highlight)"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        {/* ===================================================== */}
        {/* SOFT GLOBAL LIGHT */}
        {/* ===================================================== */}

        <ellipse
          cx="108"
          cy="18"
          rx="52"
          ry="10"
          fill="url(#h-hair-highlight)"
          opacity="0.28"
          filter="url(#h-soft-blur)"
        />
      </g>
    </g>
  );
});

HumanoidHair.displayName = "HumanoidHair";
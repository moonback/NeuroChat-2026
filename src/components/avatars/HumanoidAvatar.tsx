/**
 * HumanoidAvatar - Cinematic humanoid AI face avatar
 *
 * Drop-in replacement for RobotAvatar with:
 * - Organic silver humanoid face (matching the reference image)
 * - Multi-ring atmospheric halo with side auras
 * - Iris LED eyes with brow ridges and glass reflections
 * - Lip-shaped oscilloscope mouth
 * - All original states and audio reactivity preserved
 * - Same AvatarProps interface as RobotAvatar
 */

import { useEffect, useRef, useState } from "react";
import type { AvatarProps } from "./AvatarProps";
import type { AnimationState, AudioReactivity } from "./RobotAvatar.types";
import {
  lerp,
  getStatusTheme,
  applyAudioCurve,
  calculateEyeSaccade,
  calculateBreathingMotion,
  calculateGlitchEffect,
} from "./RobotAvatar.utils";
import { HumanoidShell } from "./HumanoidShell";
import { HumanoidEyes } from "./HumanoidEyes";
import { HumanoidMouth } from "./HumanoidMouth";
import { HumanoidHalo } from "./HumanoidHalo";
import { HumanoidHair } from "./HumanoidHair";
import { RobotEffects } from "./RobotEffects";

export function HumanoidAvatar({
  status,
  isSpeaking,
  audioLevel = 0,
  visualActivity = false,
}: AvatarProps) {
  const safeAudioLevel = Number.isFinite(audioLevel)
    ? Math.max(0, Math.min(1, audioLevel))
    : 0;
  const audioLevelRef = useRef(safeAudioLevel);
  audioLevelRef.current = safeAudioLevel;

  const animStateRef = useRef<AnimationState>({
    time: 0,
    smoothedAudio: 0,
    blinking: false,
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    headTiltX: 0,
    headTiltY: 0,
    breathPhase: 0,
    scanProgress: 0,
    glitchActive: false,
  });

  const lastFrameTimeRef = useRef<number>(0);
  const [blinking, setBlinking] = useState(false);
  const [, forceUpdate] = useState(0);

  const theme = getStatusTheme(status);

  // Natural blinking
  useEffect(() => {
    const scheduleNextBlink = (): number => {
      const delay = 2200 + Math.random() * 3200;
      return window.setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          timerRef.current = scheduleNextBlink();
        }, 130 + Math.random() * 60);
      }, delay);
    };
    const timerRef = { current: scheduleNextBlink() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // Main RAF animation loop
  useEffect(() => {
    let rafId: number;
    let frameCount = 0;

    const animate = (timestamp: number) => {
      const deltaTime = lastFrameTimeRef.current
        ? timestamp - lastFrameTimeRef.current
        : 16;
      lastFrameTimeRef.current = timestamp;

      const state = animStateRef.current;
      state.time = timestamp;

      // Smooth audio
      const targetAudio = applyAudioCurve(audioLevelRef.current, 1.2);
      state.smoothedAudio = lerp(state.smoothedAudio, targetAudio, 0.15);

      // Eye micro-saccades
      if (status !== "connecting" && frameCount % 3 === 0) {
        const saccade = calculateEyeSaccade(timestamp, 0.6);
        state.eyeOffsetX = lerp(state.eyeOffsetX, saccade.x, 0.1);
        state.eyeOffsetY = lerp(state.eyeOffsetY, saccade.y, 0.1);
      }

      // Breathing
      state.breathPhase = timestamp * 0.0008;

      // Scan progress (kept for compatibility)
      state.scanProgress += deltaTime * 0.08 * theme.pulseSpeed;
      if (state.scanProgress > 85) state.scanProgress = 0;

      // Glitch
      state.glitchActive = status === "error";

      // Visual activity reaction
      if (visualActivity) {
        state.eyeOffsetX = lerp(state.eyeOffsetX, (Math.random() - 0.5) * 10, 0.3);
        state.eyeOffsetY = lerp(state.eyeOffsetY, (Math.random() - 0.5) * 8, 0.3);
        state.headTiltX = lerp(state.headTiltX, (Math.random() - 0.5) * 1.5, 0.2);
      }

      frameCount++;
      if (frameCount % 3 === 0) {
        forceUpdate((n) => n + 1);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [status, theme.pulseSpeed, visualActivity]);

  const state = animStateRef.current;
  const breathing = calculateBreathingMotion(state.time);
  const glitch = calculateGlitchEffect(state.time, state.glitchActive);

  const audioReactivity: AudioReactivity = {
    mouthIntensity: state.smoothedAudio,
    eyeGlow: state.smoothedAudio * 0.5,
    haloIntensity: theme.glowIntensity * (1 + state.smoothedAudio * 0.3),
    antennaPulse:
      0.5 +
      0.5 * Math.sin(state.time * 0.001 * theme.pulseSpeed) +
      state.smoothedAudio * 0.4,
    bodyEnergy: state.smoothedAudio * 0.3,
  };

  // Subtle head float
  const headTiltX = Math.sin(state.time * 0.0005) * 0.6;
  const headTiltY = Math.cos(state.time * 0.0007) * 0.4;
  const haloPulse = state.time * 0.001 * theme.pulseSpeed;

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      style={{
        filter: `drop-shadow(0 12px 36px ${theme.accentColor}50)`,
      }}
    >
      {/* Background has been removed to be fully transparent */}

      <g transform={`translate(${headTiltX}, ${headTiltY})`}>
        {/* Atmospheric halo rings */}
        <HumanoidHalo
          accentColor={theme.accentColor}
          accentGlow={theme.accentGlow}
          intensity={audioReactivity.haloIntensity}
          pulsePhase={haloPulse}
        />

        {/* Silver humanoid shell (head + face anatomy) */}
        <HumanoidShell
          accentColor={theme.accentColor}
          glowIntensity={theme.glowIntensity}
          breathScale={breathing.scale}
          breathOffsetY={breathing.offsetY}
        />

        {/* Organic human hair */}
        <HumanoidHair time={state.time} />

        {/* Organic LED eyes */}
        <HumanoidEyes
          status={status}
          eyeColor={theme.eyeColor}
          accentGlow={theme.accentGlow}
          blinking={blinking}
          eyeOffsetX={state.eyeOffsetX}
          eyeOffsetY={state.eyeOffsetY}
          audioReactivity={audioReactivity.eyeGlow}
          time={state.time}
        />

        {/* Lip-shaped mouth oscilloscope */}
        <HumanoidMouth
          status={status}
          isSpeaking={isSpeaking}
          mouthColor={theme.mouthColor}
          audioReactivity={audioReactivity.mouthIntensity}
          time={state.time}
        />

        {/* Error glitch effects (unchanged) */}
        <RobotEffects
          status={status}
          glitchActive={glitch.offsetX !== 0}
          glitchOffsetX={glitch.offsetX}
          glitchOffsetY={glitch.offsetY}
          chromaticIntensity={glitch.chromatic}
        />
      </g>
    </svg>
  );
}

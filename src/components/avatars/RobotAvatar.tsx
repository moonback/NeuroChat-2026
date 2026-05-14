/**
 * RobotAvatar - Premium Cinematic AI Assistant Avatar
 * 
 * A next-generation robot avatar with:
 * - Modular component architecture
 * - Optimized 60fps performance with minimal React reconciliation
 * - Smoothed audio interpolation
 * - Advanced visual effects (metallic textures, glass reflections, bloom, glitch)
 * - Intelligent state-based behaviors
 * - Natural micro-animations (breathing, eye saccades, blinking)
 * - Premium sci-fi aesthetic
 */

import { useEffect, useRef, useState, useCallback } from "react";
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
import { RobotShell } from "./RobotShell";
import { RobotFaceScreen } from "./RobotFaceScreen";
import { RobotEyes } from "./RobotEyes";
import { RobotMouth } from "./RobotMouth";
import { RobotAntenna } from "./RobotAntenna";
import { RobotHalo } from "./RobotHalo";
import { RobotEffects } from "./RobotEffects";

export function RobotAvatar({ status, isSpeaking, audioLevel = 0 }: AvatarProps) {
  // Normalize and clamp audio input
  const safeAudioLevel = Number.isFinite(audioLevel) ? Math.max(0, Math.min(1, audioLevel)) : 0;
  
  // Animation state refs (avoid React reconciliation)
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

  // Get theme for current status
  const theme = getStatusTheme(status);

  // Natural blinking with randomized intervals
  useEffect(() => {
    const scheduleNextBlink = (): number => {
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      return window.setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          timerRef.current = scheduleNextBlink();
        }, 120 + Math.random() * 60); // 120-180ms blink duration
      }, delay);
    };

    const timerRef = { current: scheduleNextBlink() };
    return () => clearTimeout(timerRef.current);
  }, []);

  // Main animation loop with optimized RAF
  useEffect(() => {
    let rafId: number;
    let frameCount = 0;

    const animate = (timestamp: number) => {
      const deltaTime = lastFrameTimeRef.current ? timestamp - lastFrameTimeRef.current : 16;
      lastFrameTimeRef.current = timestamp;

      const state = animStateRef.current;
      
      // Update time
      state.time = timestamp;

      // Smooth audio interpolation (low-pass filter)
      const targetAudio = applyAudioCurve(safeAudioLevel, 1.2);
      state.smoothedAudio = lerp(state.smoothedAudio, targetAudio, 0.15);

      // Eye micro-saccades (subtle intelligent movement)
      if (status !== "connecting" && frameCount % 3 === 0) {
        const saccade = calculateEyeSaccade(timestamp, 0.8);
        state.eyeOffsetX = lerp(state.eyeOffsetX, saccade.x, 0.1);
        state.eyeOffsetY = lerp(state.eyeOffsetY, saccade.y, 0.1);
      }

      // Breathing motion
      state.breathPhase = timestamp * 0.0008;

      // Scan line progress
      state.scanProgress += deltaTime * 0.08 * theme.pulseSpeed;
      if (state.scanProgress > 85) state.scanProgress = 0;

      // Glitch effect (error state)
      state.glitchActive = status === "error";

      // Update every 3rd frame to reduce reconciliation overhead
      frameCount++;
      if (frameCount % 3 === 0) {
        forceUpdate((n) => n + 1);
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [status, safeAudioLevel, theme.pulseSpeed]);

  // Compute derived animation values
  const state = animStateRef.current;
  const breathing = calculateBreathingMotion(state.time);
  const glitch = calculateGlitchEffect(state.time, state.glitchActive);

  // Audio reactivity parameters
  const audioReactivity: AudioReactivity = {
    mouthIntensity: state.smoothedAudio,
    eyeGlow: state.smoothedAudio * 0.5,
    haloIntensity: theme.glowIntensity * (1 + state.smoothedAudio * 0.3),
    antennaPulse: 0.5 + 0.5 * Math.sin(state.time * 0.001 * theme.pulseSpeed) + state.smoothedAudio * 0.4,
    bodyEnergy: state.smoothedAudio * 0.3,
  };

  // Antenna rotation (listening mode)
  const antennaRotation = status === "listening" ? Math.sin(state.time * 0.002) * 4 : 0;

  // Halo pulse phase
  const haloPulse = state.time * 0.001 * theme.pulseSpeed;

  // Head subtle tilt (parallax-like)
  const headTiltX = Math.sin(state.time * 0.0005) * 0.5;
  const headTiltY = Math.cos(state.time * 0.0007) * 0.3;

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      style={{
        filter: `drop-shadow(0 10px 30px ${theme.accentColor}40)`,
      }}
    >
      <g transform={`translate(${headTiltX}, ${headTiltY})`}>
        {/* Environmental halo */}
        <RobotHalo
          accentColor={theme.accentColor}
          accentGlow={theme.accentGlow}
          intensity={audioReactivity.haloIntensity}
          pulsePhase={haloPulse}
        />

        {/* Antenna with reactive pulse */}
        <RobotAntenna
          accentColor={theme.accentColor}
          accentGlow={theme.accentGlow}
          pulseIntensity={audioReactivity.antennaPulse}
          rotationAngle={antennaRotation}
          time={state.time}
        />

        {/* Metallic shell with breathing */}
        <RobotShell
          accentColor={theme.accentColor}
          glowIntensity={theme.glowIntensity}
          breathScale={breathing.scale}
          breathOffsetY={breathing.offsetY}
        />

        {/* OLED face screen */}
        <RobotFaceScreen
          accentColor={theme.accentColor}
          scanProgress={state.scanProgress}
          status={status}
          glowIntensity={theme.glowIntensity}
        />

        {/* Intelligent LED eyes */}
        <RobotEyes
          status={status}
          eyeColor={theme.eyeColor}
          accentGlow={theme.accentGlow}
          blinking={blinking}
          eyeOffsetX={state.eyeOffsetX}
          eyeOffsetY={state.eyeOffsetY}
          audioReactivity={audioReactivity.eyeGlow}
          time={state.time}
        />

        {/* Oscilloscope mouth visualizer */}
        <RobotMouth
          status={status}
          isSpeaking={isSpeaking}
          mouthColor={theme.mouthColor}
          audioReactivity={audioReactivity.mouthIntensity}
          time={state.time}
        />

        {/* Cinematic effects (glitch, chromatic aberration) */}
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
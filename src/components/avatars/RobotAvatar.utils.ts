/**
 * Utility functions for premium robot avatar animations
 */

import type { RobotStatus, StatusTheme } from "./RobotAvatar.types";

/**
 * Linear interpolation with configurable smoothing
 */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/**
 * Smooth step interpolation for natural easing
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Perlin-like noise approximation for procedural effects
 */
export function noise(x: number, y: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Get theme configuration for each robot status
 */
export function getStatusTheme(status: RobotStatus): StatusTheme {
  switch (status) {
    case "listening":
      return {
        accentColor: "#22d3ee",
        accentGlow: "#06b6d4",
        eyeColor: "#22d3ee",
        mouthColor: "#22d3ee",
        glowIntensity: 1.2,
        pulseSpeed: 1.5,
      };
    case "speaking":
      return {
        accentColor: "#a78bfa",
        accentGlow: "#8b5cf6",
        eyeColor: "#a78bfa",
        mouthColor: "#f472b6",
        glowIntensity: 1.4,
        pulseSpeed: 2.0,
      };
    case "thinking":
      return {
        accentColor: "#60a5fa",
        accentGlow: "#3b82f6",
        eyeColor: "#60a5fa",
        mouthColor: "#60a5fa",
        glowIntensity: 0.9,
        pulseSpeed: 0.8,
      };
    case "connecting":
      return {
        accentColor: "#ef4444",
        accentGlow: "#dc2626",
        eyeColor: "#ef4444",
        mouthColor: "#ef4444",
        glowIntensity: 1.0,
        pulseSpeed: 2.5,
      };
    case "muted":
      return {
        accentColor: "#f59e0b",
        accentGlow: "#d97706",
        eyeColor: "#f59e0b",
        mouthColor: "#78716c",
        glowIntensity: 0.4,
        pulseSpeed: 0.3,
      };
    case "error":
      return {
        accentColor: "#dc2626",
        accentGlow: "#991b1b",
        eyeColor: "#dc2626",
        mouthColor: "#dc2626",
        glowIntensity: 1.5,
        pulseSpeed: 3.0,
      };
    case "idle":
    default:
      return {
        accentColor: "#818cf8",
        accentGlow: "#6366f1",
        eyeColor: "#818cf8",
        mouthColor: "#64748b",
        glowIntensity: 0.7,
        pulseSpeed: 0.6,
      };
  }
}

/**
 * Apply weighted audio response curve for natural reactivity
 */
export function applyAudioCurve(audioLevel: number, sensitivity: number = 1.0): number {
  // Apply exponential curve for more natural response
  const curved = Math.pow(audioLevel, 0.7) * sensitivity;
  return Math.max(0, Math.min(1, curved));
}

/**
 * Generate pseudo-random phase offset for mouth bars
 */
export function getBarPhaseOffset(index: number, seed: number = 0): number {
  return (index * 0.618033988749895 + seed) * Math.PI * 2;
}

/**
 * Calculate eye saccade (micro-movement) position
 */
export function calculateEyeSaccade(time: number, intensity: number = 1.0): { x: number; y: number } {
  const saccadeInterval = 3000; // ms between saccades
  const saccadeDuration = 150; // ms per saccade
  
  const cycle = (time % saccadeInterval) / saccadeInterval;
  const inSaccade = cycle < (saccadeDuration / saccadeInterval);
  
  if (!inSaccade) {
    return { x: 0, y: 0 };
  }
  
  const progress = (cycle * saccadeInterval) / saccadeDuration;
  const eased = smoothstep(0, 1, progress) * (1 - smoothstep(0.5, 1, progress));
  
  const targetX = (noise(time * 0.001) - 0.5) * 2 * intensity;
  const targetY = (noise(time * 0.001 + 100) - 0.5) * 1.5 * intensity;
  
  return {
    x: targetX * eased,
    y: targetY * eased,
  };
}

/**
 * Generate breathing motion parameters
 */
export function calculateBreathingMotion(time: number): { scale: number; offsetY: number } {
  const breathCycle = Math.sin(time * 0.0008) * 0.5 + 0.5;
  const scale = 1 + breathCycle * 0.015;
  const offsetY = Math.sin(time * 0.0008) * 1.2;
  
  return { scale, offsetY };
}

/**
 * Calculate glitch effect parameters
 */
export function calculateGlitchEffect(time: number, active: boolean): {
  offsetX: number;
  offsetY: number;
  chromatic: number;
  opacity: number;
} {
  if (!active) {
    return { offsetX: 0, offsetY: 0, chromatic: 0, opacity: 0 };
  }
  
  const glitchIntensity = noise(time * 0.05) > 0.85 ? 1 : 0;
  const offsetX = (noise(time * 0.1) - 0.5) * 4 * glitchIntensity;
  const offsetY = (noise(time * 0.1 + 50) - 0.5) * 2 * glitchIntensity;
  const chromatic = glitchIntensity * 2;
  const opacity = glitchIntensity * 0.3;
  
  return { offsetX, offsetY, chromatic, opacity };
}

/**
 * Internal types for the premium robot avatar system
 */

export type RobotStatus = "idle" | "connecting" | "listening" | "speaking" | "thinking" | "muted" | "error";

export interface StatusTheme {
  accentColor: string;
  accentGlow: string;
  eyeColor: string;
  mouthColor: string;
  glowIntensity: number;
  pulseSpeed: number;
}

export interface AnimationState {
  time: number;
  smoothedAudio: number;
  blinking: boolean;
  eyeOffsetX: number;
  eyeOffsetY: number;
  headTiltX: number;
  headTiltY: number;
  breathPhase: number;
  scanProgress: number;
  glitchActive: boolean;
  energy: number;
}

export interface AudioReactivity {
  mouthIntensity: number;
  eyeGlow: number;
  haloIntensity: number;
  antennaPulse: number;
  bodyEnergy: number;
}

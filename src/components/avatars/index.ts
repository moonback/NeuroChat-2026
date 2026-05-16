/**
 * Avatar system exports
 */

// Original robot avatar
export { RobotAvatar } from "./RobotAvatar";

// Humanoid face avatar (matches reference image style)
export { HumanoidAvatar } from "./HumanoidAvatar";

// Sub-components (humanoid)
export { HumanoidShell } from "./HumanoidShell";
export { HumanoidEyes } from "./HumanoidEyes";
export { HumanoidMouth } from "./HumanoidMouth";
export { HumanoidHalo } from "./HumanoidHalo";

// Shared types
export type { AvatarProps } from "./AvatarProps";
export type {
  RobotStatus,
  StatusTheme,
  AnimationState,
  AudioReactivity,
} from "./RobotAvatar.types";

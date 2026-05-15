/**
 * RobotAvatar - Premium Cinematic AI Assistant Avatar
 * 
 * A next-generation robot avatar wrapper.
 * Delegates rendering to the HumanoidAvatar component.
 */

import type { AvatarProps } from "./AvatarProps";
import { HumanoidAvatar } from "./HumanoidAvatar";

export function RobotAvatar(props: AvatarProps) {
  // Delegate all rendering and animation to HumanoidAvatar
  // This fixes duplicate animation loops and correctly forwards state.
  return <HumanoidAvatar {...props} />;
}
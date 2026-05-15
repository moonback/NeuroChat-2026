import type { SkillPermission } from "./types";

export const SESSION_POLICY_KEY = "neurochat_skill_policy_v2";

export interface SkillPolicyConfig {
  roles: string[];
  expiresAt?: number;
  allow: Record<string, SkillPermission["level"][]>;
  deny: string[];
}

export function loadSkillPolicyConfig(): SkillPolicyConfig {
  try {
    const raw = localStorage.getItem(SESSION_POLICY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SkillPolicyConfig>) : {};
    return {
      roles: parsed.roles ?? ["user"],
      expiresAt: parsed.expiresAt,
      allow: parsed.allow ?? {},
      deny: parsed.deny ?? ["open_website"],
    };
  } catch {
    return { roles: ["user"], allow: {}, deny: ["open_website"] };
  }
}

export function saveSkillPolicyConfig(config: SkillPolicyConfig): void {
  localStorage.setItem(SESSION_POLICY_KEY, JSON.stringify(config));
}

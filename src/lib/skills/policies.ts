import type { ConfirmationHandler, PermissionAuthorizer, SkillContext, SkillPermission } from "./types";

import { loadSkillPolicyConfig } from "./policyStore";

interface PolicyRecord {
  roles: string[];
  expiresAt?: number;
  allow: Record<string, SkillPermission["level"][]>;
  deny: string[];
}

async function loadPolicy(): Promise<PolicyRecord> {
  return loadSkillPolicyConfig();
}

export const defaultPermissionAuthorizer: PermissionAuthorizer = async (permissions, context, skillName) => {
  const policy = await loadPolicy();
  if (policy.expiresAt && Date.now() > policy.expiresAt) return false;
  if (policy.deny.includes(skillName)) return false;

  const isAdmin = (context.metadata?.role as string | undefined) === "admin" || policy.roles.includes("admin");
  return permissions.every((perm) => {
    const allowed = policy.allow[perm.resource] ?? (isAdmin ? ["read", "write", "execute"] : ["read"]);
    return allowed.includes(perm.level);
  });
};

export const defaultConfirmationHandler: ConfirmationHandler = async (skill, context) => {
  if (!skill.requiresConfirmation) return true;
  const reason = context.metadata?.reason ? `\nContexte: ${String(context.metadata.reason)}` : "";
  return window.confirm(`Autoriser l'action sensible: ${skill.name} ?${reason}`);
};

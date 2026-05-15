import type { ConfirmationHandler, PermissionAuthorizer, SkillContext, SkillPermission } from "./types";

const SESSION_POLICY_KEY = "neurochat_skill_policy";

function loadSessionPolicy(): Record<string, SkillPermission["level"][]> {
  try {
    const raw = localStorage.getItem(SESSION_POLICY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SkillPermission["level"][]>) : {};
  } catch {
    return {};
  }
}

export const defaultPermissionAuthorizer: PermissionAuthorizer = async (permissions, _context: SkillContext) => {
  const policy = loadSessionPolicy();
  return permissions.every((perm) => {
    const allowed = policy[perm.resource] ?? ["read"];
    return allowed.includes(perm.level);
  });
};

export const defaultConfirmationHandler: ConfirmationHandler = async (skill) => {
  if (!skill.requiresConfirmation) return true;
  return window.confirm(`Autoriser l'action sensible: ${skill.name} ?`);
};

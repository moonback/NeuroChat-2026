import type { ConfirmationHandler, PermissionAuthorizer, SkillContext, SkillPermission } from "./types";

const SESSION_POLICY_KEY = "neurochat_skill_policy_v2";

interface PolicyRecord {
  roles: string[];
  expiresAt?: number;
  allow: Record<string, SkillPermission["level"][]>;
  deny: string[];
}

function loadPolicy(): PolicyRecord {
  try {
    const raw = localStorage.getItem(SESSION_POLICY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PolicyRecord>) : {};
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

export const defaultPermissionAuthorizer: PermissionAuthorizer = async (permissions, context, skillName) => {
  const policy = loadPolicy();
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

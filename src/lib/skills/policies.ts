import type { ConfirmationHandler, PermissionAuthorizer, SkillPermission } from "./types";

import { defaultSecurityLogger } from "../learning/securityLogger";
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

function summarizePermissions(permissions: SkillPermission[]): string {
  if (permissions.length === 0) return "Aucune permission déclarée";
  return permissions.map((perm) => `${perm.resource}:${perm.level}`).join(", ");
}

function formatRiskLevel(riskLevel: string | undefined): string {
  if (riskLevel === "high") return "Risque élevé";
  if (riskLevel === "medium") return "Risque moyen";
  if (riskLevel === "low") return "Risque faible";
  return "Risque non spécifié";
}

function showSkillConfirmationDialog(skillName: string, reason: string, permissions: string, riskLevel?: string): Promise<boolean> {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const titleId = `skill-confirmation-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", titleId);
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:rgba(2,6,23,0.72)",
      "backdrop-filter:blur(8px)",
      "padding:24px",
    ].join(";");

    const panel = document.createElement("div");
    panel.style.cssText = [
      "max-width:520px",
      "width:100%",
      "border:1px solid rgba(251,191,36,0.35)",
      "border-radius:24px",
      "background:linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))",
      "box-shadow:0 24px 80px rgba(0,0,0,0.45)",
      "padding:24px",
      "color:#e2e8f0",
      "font-family:Inter,ui-sans-serif,system-ui,sans-serif",
    ].join(";");

    const title = document.createElement("h2");
    title.id = titleId;
    title.textContent = "Autoriser une action sensible ?";
    title.style.cssText = "margin:0 0 12px;font-size:20px;font-weight:800;color:#f8fafc";

    const riskBadge = document.createElement("p");
    riskBadge.textContent = formatRiskLevel(riskLevel);
    riskBadge.style.cssText = "display:inline-flex;margin:0 0 14px;padding:4px 10px;border-radius:999px;background:rgba(251,191,36,0.14);border:1px solid rgba(251,191,36,0.35);color:#fde68a;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em";

    const description = document.createElement("p");
    description.textContent = `NeuroChat demande l'autorisation d'exécuter le skill « ${skillName} ».`;
    description.style.cssText = "margin:0 0 16px;line-height:1.5;color:#cbd5e1";

    const permissionText = document.createElement("p");
    permissionText.textContent = `Permissions: ${permissions}`;
    permissionText.style.cssText = "margin:0 0 12px;font-size:13px;color:#fbbf24";

    const reasonText = document.createElement("p");
    reasonText.textContent = reason ? `Contexte: ${reason}` : "Aucun contexte détaillé fourni.";
    reasonText.style.cssText = "margin:0 0 20px;font-size:13px;color:#94a3b8;line-height:1.45";

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:12px;justify-content:flex-end";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Refuser";
    cancel.style.cssText = "padding:10px 16px;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:rgba(15,23,42,0.9);color:#e2e8f0;font-weight:700;cursor:pointer";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = "Autoriser";
    confirm.style.cssText = "padding:10px 16px;border-radius:12px;border:1px solid rgba(251,191,36,0.6);background:#fbbf24;color:#111827;font-weight:900;cursor:pointer";

    let settled = false;
    const close = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      previousFocus?.focus();
      resolve(accepted);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };

    cancel.addEventListener("click", () => close(false));
    confirm.addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKeyDown);

    actions.append(cancel, confirm);
    panel.append(title, riskBadge, description, permissionText, reasonText, actions);
    overlay.append(panel);
    document.body.append(overlay);
    confirm.focus();
  });
}

export const defaultConfirmationHandler: ConfirmationHandler = async (skill, context) => {
  if (!skill.requiresConfirmation) return true;
  const reason = context.metadata?.reason ? String(context.metadata.reason) : "";
  const permissions = summarizePermissions(skill.permissions);
  const accepted = await showSkillConfirmationDialog(skill.name, reason, permissions, skill.riskLevel);
  const metadataKeys = Object.keys(context.metadata ?? {}).sort();

  void defaultSecurityLogger.logModificationAttempt("skill_confirmation", accepted ? "Skill confirmation accepted" : "Skill confirmation rejected", {
    skillName: skill.name,
    permissions,
    accepted,
    riskLevel: skill.riskLevel ?? "unspecified",
    reasonPresent: reason.length > 0,
    metadataKeys,
  });

  return accepted;
};

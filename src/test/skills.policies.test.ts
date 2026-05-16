import { fireEvent, screen } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultSecurityLogger } from "../lib/learning/securityLogger";
import { defaultConfirmationHandler } from "../lib/skills/policies";
import type { SkillDefinition } from "../lib/skills/types";

const sensitiveSkill: SkillDefinition = {
  name: "write-file",
  description: "write a file",
  category: "system",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  permissions: [{ resource: "filesystem", level: "write" }],
  riskLevel: "high",
  requiresConfirmation: true,
  async execute() {
    return { ok: true };
  },
};

describe("defaultConfirmationHandler", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders an audited risk modal and resolves accepted confirmations", async () => {
    const auditSpy = vi.spyOn(defaultSecurityLogger, "logModificationAttempt").mockResolvedValue({
      id: "security_1",
      type: "modification_attempt",
      timestamp: 1,
      message: "Skill confirmation accepted",
    });

    const confirmation = defaultConfirmationHandler(sensitiveSkill, {
      sessionId: "session-1",
      userId: "user-1",
      metadata: { reason: "contains a sensitive path", ticketId: "T-1" },
    }, {});

    expect(await screen.findByRole("dialog", { name: "Autoriser une action sensible ?" })).toBeInTheDocument();
    expect(screen.getByText("Risque élevé")).toBeInTheDocument();
    expect(screen.getByText("Permissions: filesystem:write")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Autoriser" }));

    await expect(confirmation).resolves.toBe(true);
    expect(auditSpy).toHaveBeenCalledWith("skill_confirmation", "Skill confirmation accepted", {
      skillName: "write-file",
      permissions: "filesystem:write",
      accepted: true,
      riskLevel: "high",
      reasonPresent: true,
      metadataKeys: ["reason", "ticketId"],
    });
    expect(auditSpy.mock.calls[0][2]).not.toHaveProperty("reason");
  });

  it("resolves rejected confirmations from Escape", async () => {
    const auditSpy = vi.spyOn(defaultSecurityLogger, "logModificationAttempt").mockResolvedValue({
      id: "security_2",
      type: "modification_attempt",
      timestamp: 2,
      message: "Skill confirmation rejected",
    });

    const confirmation = defaultConfirmationHandler(sensitiveSkill, {
      sessionId: "session-1",
      userId: "user-1",
    }, {});

    expect(await screen.findByRole("dialog", { name: "Autoriser une action sensible ?" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    await expect(confirmation).resolves.toBe(false);
    expect(auditSpy).toHaveBeenCalledWith("skill_confirmation", "Skill confirmation rejected", expect.objectContaining({
      accepted: false,
      reasonPresent: false,
      metadataKeys: [],
    }));
  });
});

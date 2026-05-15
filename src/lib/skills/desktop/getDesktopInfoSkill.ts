import type { SkillDefinition } from "../types";

export const getDesktopInfoSkill: SkillDefinition<never, { platform: string; userAgent: string }> = {
  name: "get_desktop_info",
  description: "Read local desktop runtime info",
  category: "desktop",
  parameters: { type: "object", properties: {}, additionalProperties: false },
  permissions: [{ resource: "desktop", level: "read" }],
  cooldownMs: 1000,
  async execute() {
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    };
  },
};

import { BrowserController } from "../../browserControl";
import type { SkillDefinition } from "../types";

export const openWebsiteSkill: SkillDefinition<{ url: string }, { url?: string; opened?: boolean }> = {
  name: "open_website",
  description: "Open a website in controlled browser",
  category: "browser",
  parameters: {
    type: "object",
    properties: { url: { type: "string", description: "Fully-qualified URL" } },
    required: ["url"],
    additionalProperties: false,
  },
  permissions: [{ resource: "browser", level: "execute" }],
  cooldownMs: 1000,
  requiresConfirmation: true,
  async execute(params) {
    const browser = new BrowserController();
    const result = await browser.executeAction({ type: "navigate", params: { url: params.url } });
    if (!result.success) throw new Error(result.error ?? "Impossible d'ouvrir le site");
    return { url: result.data?.url as string | undefined, opened: (result.data as { opened?: boolean } | undefined)?.opened };
  },
};

import { BrowserController } from "../../browserControl";
import type { SkillDefinition } from "../types";

export const extractPageSkill: SkillDefinition<{ selector?: string }, { content: unknown }> = {
  name: "extract_page",
  description: "Extract structured content from current page",
  category: "browser",
  parameters: { type: "object", properties: { selector: { type: "string" } }, additionalProperties: false },
  permissions: [{ resource: "browser", level: "read" }],
  async execute(params) {
    const browser = new BrowserController();
    const result = await browser.executeAction({
      type: "extract",
      params: params.selector ? { selector: { selector: params.selector } } : undefined,
    });
    if (!result.success) throw new Error(result.error ?? "Extract failed");
    return { content: result.data };
  },
};

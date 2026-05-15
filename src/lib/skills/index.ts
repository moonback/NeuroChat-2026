import { SkillRegistry } from "./registry";
import { summarizeTextSkill } from "./ai/summarizeTextSkill";
import { openWebsiteSkill } from "./browser/openWebsiteSkill";
import { getDesktopInfoSkill } from "./desktop/getDesktopInfoSkill";
import { retrieveContextSkill } from "./memory/retrieveContextSkill";

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.registerMany([openWebsiteSkill, retrieveContextSkill, getDesktopInfoSkill, summarizeTextSkill]);
  return registry;
}

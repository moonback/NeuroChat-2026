import { SkillRegistry } from "./registry";
import { summarizeTextSkill } from "./ai/summarizeTextSkill";
import { extractPageSkill } from "./browser/extractPageSkill";
import { openWebsiteSkill } from "./browser/openWebsiteSkill";
import { getDesktopInfoSkill } from "./desktop/getDesktopInfoSkill";
import { retrieveContextSkill } from "./memory/retrieveContextSkill";
import { saveMemoryNoteSkill } from "./memory/saveMemoryNoteSkill";
import { defaultConfirmationHandler, defaultPermissionAuthorizer } from "./policies";

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry(defaultPermissionAuthorizer, defaultConfirmationHandler);
  registry.registerMany([
    openWebsiteSkill,
    extractPageSkill,
    retrieveContextSkill,
    saveMemoryNoteSkill,
    getDesktopInfoSkill,
    summarizeTextSkill,
  ]);
  return registry;
}

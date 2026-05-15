export interface MarkdownSkillDoc {
  name: string;
  content: string;
}

export function loadMarkdownSkillDocs(): MarkdownSkillDoc[] {
  const modules = import.meta.glob("../../skills-md/*.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

  return Object.entries(modules)
    .map(([path, content]) => {
      const name = path.split("/").pop()?.replace(/\.md$/i, "") ?? "unknown";
      return { name, content: String(content).trim() };
    })
    .filter((doc) => doc.content.length > 0 && doc.name.toLowerCase() !== "readme");
}

export function buildMarkdownSkillsPromptSection(): string {
  const docs = loadMarkdownSkillDocs();
  if (docs.length === 0) return "";

  const rendered = docs
    .map((doc) => `### SKILL_MD: ${doc.name}\n${doc.content}`)
    .join("\n\n");

  return [
    "### EXTERNAL SKILLS (Markdown)",
    "Tu dois utiliser ces skills comme capacités disponibles si pertinentes.",
    rendered,
  ].join("\n\n");
}

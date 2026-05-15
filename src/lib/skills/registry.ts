import type { SkillContext, SkillDefinition, SkillExecutionResult } from "./types";

export class SkillRegistry {
  private readonly skills = new Map<string, SkillDefinition>();
  private readonly cooldowns = new Map<string, number>();

  register<TParams, TResult>(skill: SkillDefinition<TParams, TResult>): void {
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill déjà enregistrée: ${skill.name}`);
    }
    this.skills.set(skill.name, skill as SkillDefinition);
  }

  registerMany(skills: SkillDefinition[]): void {
    skills.forEach((skill) => this.register(skill));
  }

  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  search(query: string): SkillDefinition[] {
    const q = query.toLowerCase();
    return this.list().filter((skill) =>
      skill.name.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q),
    );
  }

  async execute<TParams = unknown, TResult = unknown>(
    name: string,
    params: TParams,
    context: SkillContext,
  ): Promise<SkillExecutionResult<TResult>> {
    const skill = this.get(name);
    if (!skill) {
      return { ok: false, skill: name, error: `Skill introuvable: ${name}`, elapsedMs: 0, timestamp: Date.now() };
    }

    const now = Date.now();
    const key = `${context.userId}:${name}`;
    const lastRun = this.cooldowns.get(key) ?? 0;
    if (skill.cooldownMs && now - lastRun < skill.cooldownMs) {
      return { ok: false, skill: name, error: `Cooldown actif pour ${name}`, elapsedMs: 0, timestamp: now };
    }

    const startedAt = performance.now();
    try {
      const data = await skill.execute(params, context);
      this.cooldowns.set(key, now);
      return {
        ok: true,
        skill: name,
        data: data as TResult,
        elapsedMs: performance.now() - startedAt,
        timestamp: Date.now(),
      };
    } catch (error: unknown) {
      return {
        ok: false,
        skill: name,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        elapsedMs: performance.now() - startedAt,
        timestamp: Date.now(),
      };
    }
  }
}

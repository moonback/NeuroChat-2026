import type {
  ConfirmationHandler,
  JsonSchema,
  PermissionAuthorizer,
  SkillContext,
  SkillDefinition,
  SkillExecutionResult,
} from "./types";

function validateSchema(schema: JsonSchema, value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Les paramètres doivent être un objet";
  }
  const input = value as Record<string, unknown>;

  for (const required of schema.required ?? []) {
    if (!(required in input)) return `Paramètre requis manquant: ${required}`;
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!schema.properties[key]) return `Paramètre non autorisé: ${key}`;
    }
  }

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (!(key in input)) continue;
    const val = input[key];
    const actualType = Array.isArray(val) ? "array" : typeof val;
    if (actualType !== prop.type) {
      return `Type invalide pour ${key}: attendu ${prop.type}, reçu ${actualType}`;
    }
  }

  return null;
}

export class SkillRegistry {
  private readonly skills = new Map<string, SkillDefinition>();
  private readonly cooldowns = new Map<string, number>();

  constructor(
    private readonly authorize?: PermissionAuthorizer,
    private readonly confirm?: ConfirmationHandler,
  ) {}

  register<TParams, TResult>(skill: SkillDefinition<TParams, TResult>): void {
    if (this.skills.has(skill.name)) throw new Error(`Skill déjà enregistrée: ${skill.name}`);
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
    const q = query.toLowerCase().trim();
    return this.list().filter((skill) => skill.name.toLowerCase().includes(q) || skill.description.toLowerCase().includes(q));
  }

  async execute<TParams = unknown, TResult = unknown>(name: string, params: TParams, context: SkillContext): Promise<SkillExecutionResult<TResult>> {
    const skill = this.get(name);
    const now = Date.now();

    if (!skill) return { ok: false, skill: name, error: `Skill introuvable: ${name}`, elapsedMs: 0, timestamp: now };

    const schemaError = validateSchema(skill.parameters, params);
    if (schemaError) return { ok: false, skill: name, error: schemaError, elapsedMs: 0, timestamp: now };

    const key = `${context.userId}:${name}`;
    const lastRun = this.cooldowns.get(key) ?? 0;
    if (skill.cooldownMs && now - lastRun < skill.cooldownMs) {
      return { ok: false, skill: name, error: `Cooldown actif pour ${name}`, elapsedMs: 0, timestamp: now };
    }

    if (this.authorize) {
      const authorized = await this.authorize(skill.permissions, context, name);
      if (!authorized) return { ok: false, skill: name, error: `Permission refusée pour ${name}`, elapsedMs: 0, timestamp: now };
    }

    if (skill.requiresConfirmation && this.confirm) {
      const accepted = await this.confirm(skill, context, params);
      if (!accepted) return { ok: false, skill: name, error: `Action ${name} annulée`, elapsedMs: 0, timestamp: now };
    }

    const startedAt = performance.now();
    try {
      const data = await skill.execute(params, context);
      this.cooldowns.set(key, now);
      return { ok: true, skill: name, data: data as TResult, elapsedMs: performance.now() - startedAt, timestamp: Date.now() };
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

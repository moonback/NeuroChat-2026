export type SkillCategory = "browser" | "memory" | "desktop" | "ai" | "system";

export type JsonPrimitiveType = "string" | "number" | "boolean" | "object" | "array";

export interface JsonSchemaProperty {
  type: JsonPrimitiveType;
  description?: string;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface SkillPermission {
  resource: string;
  level: "read" | "write" | "execute";
}

export interface SkillContext {
  sessionId: string;
  userId: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface SkillDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  category: SkillCategory;
  parameters: JsonSchema;
  permissions: SkillPermission[];
  cooldownMs?: number;
  requiresConfirmation?: boolean;
  execute: (params: TParams, context: SkillContext) => Promise<TResult>;
}

export interface SkillExecutionResult<TResult = unknown> {
  ok: boolean;
  skill: string;
  data?: TResult;
  error?: string;
  elapsedMs: number;
  timestamp: number;
}

export type PermissionAuthorizer = (
  permissions: SkillPermission[],
  context: SkillContext,
  skillName: string,
) => Promise<boolean>;

export type ConfirmationHandler = (
  skill: SkillDefinition,
  context: SkillContext,
  params: unknown,
) => Promise<boolean>;

/**
 * Journaux structurés pour le système d'auto-amélioration continue (prompt + feedback).
 * Préfixe unique pour filtrage console / panneau de debug.
 */

export const AUTO_IMPROVEMENT_LOG_PREFIX = "[AutoAmélioration]";

export function truncateForLog(text: string, maxChars = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}… (${t.length} car.)`;
}

export function logAutoImprovement(phase: string, detail: string, data?: unknown): void {
  const head = `${AUTO_IMPROVEMENT_LOG_PREFIX} [${phase}] ${detail}`;
  if (data === undefined) {
    console.log(head);
  } else {
    console.log(head, data);
  }
}

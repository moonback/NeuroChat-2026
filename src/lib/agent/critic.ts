import type { SkillExecutionResult } from "../skills/types";
import type { AgentExecutionState } from "./types";

export interface Criticism {
  ok: boolean;
  confidence: number;
  message: string;
  action: "continue" | "retry" | "abort" | "adjust_plan";
  suggestedArguments?: Record<string, any>;
}

/**
 * ExecutionCritic evaluates tool results to prevent hallucinations 
 * and ensure the agent stays on track toward the goal.
 */
export class ExecutionCritic {
  private recoveryAttempts = new Map<string, number>();

  /**
   * Evaluates the outcome of a tool execution.
   */
  async evaluate(result: SkillExecutionResult, state: AgentExecutionState): Promise<Criticism> {
    const { skill, ok, error, data, confidence: resultConfidence } = result;
    const recoveryKey = `${state.sessionId}:${skill}:${state.iteration}`;
    
    // 1. Basic failure handling
    if (!ok) {
      const attempts = (this.recoveryAttempts.get(recoveryKey) ?? 0) + 1;
      this.recoveryAttempts.set(recoveryKey, attempts);

      if (attempts > 3) {
        return {
          ok: false,
          confidence: 0,
          message: `Échecs critiques répétés (${attempts}) pour ${skill}. Action compromise.`,
          action: "abort",
        };
      }

      const recovery = this.suggestRecovery(skill, error || "");
      const isRetryable = this.isErrorRetryable(error || "") || !!recovery;
      
      return {
        ok: false,
        confidence: 0,
        message: recovery 
          ? `Erreur détectée dans ${skill}: ${error}. Suggestion de récupération: ${recovery}`
          : `Erreur détectée dans ${skill}: ${error}`,
        action: isRetryable ? "retry" : "adjust_plan",
      };
    }

    // 2. Coherence check
    const confidence = resultConfidence ?? 0.9;
    
    // 3. Heuristic: Empty data for a data-fetching tool
    if (this.isDataEmpty(data) && this.expectedData(skill)) {
      return {
        ok: false,
        confidence: 0.3,
        message: `L'outil ${skill} a retourné un résultat vide alors qu'une donnée était attendue.`,
        action: "adjust_plan",
      };
    }

    // 4. Threshold check
    if (confidence < 0.5) {
      return {
        ok: false,
        confidence,
        message: `La confiance dans le résultat de ${skill} est trop faible (${confidence}).`,
        action: "retry",
      };
    }

    this.recoveryAttempts.delete(recoveryKey);

    return {
      ok: true,
      confidence,
      message: "Résultat validé par le critique.",
      action: "continue",
    };
  }

  private isErrorRetryable(error: string): boolean {
    const retryableErrors = ["timeout", "network", "rate limit", "busy"];
    return retryableErrors.some(e => error.toLowerCase().includes(e));
  }

  private suggestRecovery(skill: string, error: string): string | null {
    const err = error.toLowerCase();
    if (skill.includes("click") || skill.includes("browser") || skill.includes("page")) {
      if (err.includes("not found") || err.includes("selector") || err.includes("no element")) {
        return "L'élément n'est pas visible ou le sélecteur a changé. Essaye de scroller ou d'utiliser un sélecteur plus générique ou sémantique.";
      }
      if (err.includes("timeout") || err.includes("loading")) {
        return "La page met trop de temps à charger. Essaye d'attendre (wait) ou de rafraîchir la page.";
      }
      if (err.includes("intersecting") || err.includes("hidden") || err.includes("obscured")) {
        return "L'élément est masqué par un autre ou hors écran. Scrolle pour le mettre en vue avant de cliquer.";
      }
    }
    return null;
  }

  private isDataEmpty(data: any): boolean {
    if (data === null || data === undefined) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    if (typeof data === "object" && Object.keys(data).length === 0) return true;
    if (typeof data === "string" && data.trim() === "") return true;
    return false;
  }

  private expectedData(skill: string): boolean {
    const dataSkills = ["search", "read", "get", "list", "fetch", "find"];
    return dataSkills.some(s => skill.toLowerCase().includes(s));
  }
}

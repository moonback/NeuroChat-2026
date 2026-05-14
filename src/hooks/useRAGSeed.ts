/**
 * useRAGSeed
 *
 * Hook utilitaire pour pré-charger des données statiques dans le RAG
 * au moment où l'utilisateur est connu.
 *
 * Usage :
 *   const { seedUserContext } = useRAGSeed();
 *   await seedUserContext("Marie", [
 *     { text: "Marie est designer UX chez une startup parisienne." },
 *     { text: "Elle préfère les réponses courtes et sans jargon." },
 *   ]);
 */

import { useCallback } from "react";
import { seedRAG, embedAndStore, SeedEntry } from "../lib/vectorStore";

export function useRAGSeed() {
  /**
   * Injecter une liste de faits/préférences statiques dans le RAG.
   * Idempotent : les entrées déjà présentes sont ignorées.
   */
  const seedUserContext = useCallback(
    async (userName: string, entries: SeedEntry[]) => {
      if (!userName || entries.length === 0) return;
      return seedRAG(userName, entries);
    },
    []
  );

  /**
   * Injecter un seul fait immédiatement (non idempotent — crée toujours une entrée).
   * Utile pour capturer une information dite pendant la conversation.
   *
   * @example
   * await injectFact("Marie", "Elle a mentionné qu'elle part en vacances le 1er juin.");
   */
  const injectFact = useCallback(
    async (
      userName: string,
      text: string,
      speaker: "user" | "assistant" = "user"
    ) => {
      if (!userName || !text.trim()) return;
      await embedAndStore(text, {
        sessionId: "injected",
        userName,
        speaker,
        timestamp: Date.now(),
      });
      console.log(`[RAG] Fait injecté pour ${userName}: "${text.slice(0, 60)}..."`);
    },
    []
  );

  return { seedUserContext, injectFact };
}

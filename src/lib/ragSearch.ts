/**
 * RAG (Retrieval-Augmented Generation) Search
 *
 * Orchestrates semantic search over the conversation history and formats
 * the results into a context block ready to be injected into the system prompt.
 */

import { semanticSearch, VectorEntry } from "./vectorStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RAGContext {
  /** Formatted text block to inject into the system prompt */
  contextBlock: string;
  /** Raw retrieved entries (for debugging / UI display) */
  entries: Array<VectorEntry & { score: number }>;
  /** Whether any relevant context was found */
  hasContext: boolean;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Retrieve semantically relevant past conversation turns for a given query.
 *
 * @param query     The current user message (used as the search query)
 * @param userName  Filter results to this user's history
 * @param topK      Max number of relevant turns to retrieve (default: 5)
 * @param threshold Minimum similarity score to include (default: 0.62)
 */
export async function retrieveRelevantContext(
  query: string,
  userName: string,
  workdir?: string | null,
  topK = 5,
  threshold = 0.62
): Promise<RAGContext> {
  if (!query.trim() || !userName) {
    return { contextBlock: "", entries: [], hasContext: false };
  }

  const results = await semanticSearch(query, userName, topK, threshold);

  // --- LOCAL PROJECT RAG (Phase 3) ---
  let projectResults: any[] = [];
  if (workdir && window.neurochatElectron?.memory) {
    console.log(`[RAG] 📁 Recherche sémantique dans le projet: ${workdir}`);
    projectResults = await window.neurochatElectron.memory.search({ query, workdir });
  }


  if (results.length === 0) {
    return { contextBlock: "", entries: [], hasContext: false };
  }

  // Sort by timestamp so the context reads chronologically
  const sorted = [...results].sort(
    (a, b) => a.metadata.timestamp - b.metadata.timestamp
  );

  const lines = sorted.map((entry) => {
    const speaker = entry.metadata.speaker === "user" ? userName : "Assistant";
    const date = new Date(entry.metadata.timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return `[${date}] ${speaker}: ${entry.text}`;
  });

  const projectLines = projectResults.map(r => `[Fichier: ${r.path}] (Score: ${r.score.toFixed(2)})\n${r.content}`);

  const contextBlocks = [];
  
  if (lines.length > 0) {
    contextBlocks.push(
      "### MÉMOIRE SÉMANTIQUE (historique conversations)",
      ...lines
    );
  }

  if (projectLines.length > 0) {
    contextBlocks.push(
      "",
      "### CONTEXTE DU PROJET (fichiers locaux)",
      "Voici des extraits pertinents de tes fichiers de travail :",
      ...projectLines
    );
  }

  const contextBlock = [
    ...contextBlocks,
    "",
    "Utilise ces informations pour enrichir ta réponse si pertinent. Si tu vois du code source, aide l'utilisateur avec précision.",
  ].join("\n");

  return { contextBlock, entries: results, hasContext: results.length > 0 || projectResults.length > 0 };
}

/**
 * Build a lightweight summary of what the user has talked about most,
 * based on the topics present in the vector store.
 * Used to enrich the system prompt with long-term user interests.
 */
export async function buildTopicSummary(
  userName: string,
  sampleQueries: string[] = [
    "projets et objectifs",
    "problèmes et difficultés",
    "préférences et habitudes",
    "questions techniques",
    "humeur et émotions",
  ]
): Promise<string> {
  const allResults: Array<VectorEntry & { score: number }> = [];

  for (const query of sampleQueries) {
    const results = await semanticSearch(query, userName, 3, 0.65);
    allResults.push(...results);
  }

  if (allResults.length === 0) return "";

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = allResults.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Take the top 8 by score
  const top = unique
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

  const lines = top.map((e) => {
    const speaker = e.metadata.speaker === "user" ? userName : "Assistant";
    return `${speaker}: ${e.text}`;
  });

  return [
    "### CENTRES D'INTÉRÊT DÉTECTÉS (mémoire long-terme)",
    ...lines,
  ].join("\n");
}

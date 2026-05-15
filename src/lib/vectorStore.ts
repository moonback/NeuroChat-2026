/**
 * Vector Store — Client-side RAG for NeuroChat
 *
 * Stores text embeddings in localStorage and provides cosine-similarity
 * search over the full conversation history.
 *
 * Embeddings are generated via the Gemini embedding-001 model
 * (already available through @google/genai).
 */

import { GoogleGenAI } from "@google/genai";
import { getStorageBackend } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VectorEntry {
  /** Unique identifier (matches ConversationTurn timestamp + speaker) */
  id: string;
  /** The original text that was embedded */
  text: string;
  /** Embedding vector (float array) */
  vector: number[];
  /** Metadata for context reconstruction */
  metadata: {
    sessionId: string;
    userName: string;
    speaker: "user" | "assistant";
    timestamp: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum entries kept in the vector store (older ones are pruned) */
const MAX_VECTOR_ENTRIES = 500;
/** Gemini embedding model — gemini-embedding-001 remplace text-embedding-004 (déprécié jan 2026) */
const EMBEDDING_MODEL = "gemini-embedding-001";

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function loadVectorStore(): Promise<VectorEntry[]> {
  try {
    console.log("[VectorStore] 📂 Chargement du store de vecteurs...");
    const rows = await getStorageBackend().loadVectors();
    const entries = rows.map((r) => ({
      id: r.id,
      text: r.text,
      vector: r.vector,
      metadata: { sessionId: r.sessionId, userName: r.userName, speaker: r.speaker, timestamp: r.timestamp },
    } as VectorEntry));
    console.log(`[VectorStore] ✅ ${entries.length} vecteur(s) chargé(s)`);
    return entries;
  } catch (error) {
    console.error("[VectorStore] ❌ Échec du chargement:", error);
    return [];
  }
}

async function saveVectorStore(entries: VectorEntry[]): Promise<void> {
  try {
    console.log(`[VectorStore] 💾 Sauvegarde de ${entries.length} vecteur(s)...`);
    // Keep only the most recent entries to stay within localStorage limits
    const limited = entries.slice(-MAX_VECTOR_ENTRIES);
    if (limited.length < entries.length) {
      console.log(`[VectorStore] ⚠️ Limitation à ${MAX_VECTOR_ENTRIES} vecteurs (${entries.length - limited.length} supprimé(s))`);
    }
    await getStorageBackend().clearVectors();
    for (const e of limited) {
      await getStorageBackend().addVector({ id: e.id, text: e.text, vector: e.vector, sessionId: e.metadata.sessionId, userName: e.metadata.userName, speaker: e.metadata.speaker, timestamp: e.metadata.timestamp });
    }
    console.log("[VectorStore] ✅ Vecteurs sauvegardés avec succès");
  } catch (error) {
    console.error("[VectorStore] ❌ Échec de la sauvegarde:", error);
  }
}

// ─── Embedding generation ─────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text using Gemini.
 * Returns null if the API key is missing or the call fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[VectorStore] ⚠️ VITE_GEMINI_API_KEY not set — skipping embedding.");
    return null;
  }

  try {
    console.log(`[VectorStore] 🔄 Génération d'embedding pour: "${text.slice(0, 50)}..."`);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    const embedding = response.embeddings?.[0]?.values ?? null;
    if (embedding) {
      console.log(`[VectorStore] ✅ Embedding généré (${embedding.length} dimensions)`);
    } else {
      console.warn("[VectorStore] ⚠️ Aucun embedding retourné par l'API");
    }
    return embedding;
  } catch (error) {
    console.error("[VectorStore] ❌ Échec de la génération d'embedding:", error);
    return null;
  }
}

// ─── Vector math ──────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors (range: -1 to 1, higher = more similar).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Store operations ─────────────────────────────────────────────────────────

/**
 * Add a new entry to the vector store.
 * Skips if an entry with the same id already exists.
 */
export async function addVectorEntry(entry: VectorEntry): Promise<void> {
  const store = await loadVectorStore();
  if (store.some((e) => e.id === entry.id)) return; // deduplicate
  store.push(entry);
  await saveVectorStore(store);
}

/**
 * Embed a conversation turn and persist it to the vector store.
 * This is fire-and-forget — failures are logged but not thrown.
 */
export async function embedAndStore(
  text: string,
  metadata: VectorEntry["metadata"]
): Promise<void> {
  const id = `${metadata.timestamp}_${metadata.speaker}`;
  console.log(`[VectorStore] 🔄 Tentative d'embedding pour: ${id}`);

  // Skip if already embedded
  const store = await loadVectorStore();
  if (store.some((e) => e.id === id)) {
    console.log(`[VectorStore] ⏭️ Vecteur déjà existant, ignoré: ${id}`);
    return;
  }

  const vector = await generateEmbedding(text);
  if (!vector) {
    console.log(`[VectorStore] ⚠️ Pas de vecteur généré pour: ${id}`);
    return;
  }

  console.log(`[VectorStore] ➕ Ajout du vecteur: ${id}`);
  await addVectorEntry({ id, text, vector, metadata });
}

/**
 * Search the vector store for the top-k most semantically similar entries
 * to the given query text.
 *
 * @param queryText  The search query (will be embedded on the fly)
 * @param userName   Filter results to this user
 * @param topK       Number of results to return (default: 5)
 * @param threshold  Minimum cosine similarity to include (default: 0.6)
 */
export async function semanticSearch(
  queryText: string,
  userName: string,
  topK = 5,
  threshold = 0.6
): Promise<Array<VectorEntry & { score: number }>> {
  const queryVector = await generateEmbedding(queryText);
  if (!queryVector) {
    console.warn("[RAG] ⚠️ Embedding indisponible, recherche sémantique ignorée");
    return [];
  }

  const store = (await loadVectorStore()).filter(
    (e) => e.metadata.userName === userName
  );

  const scored = store
    .map((entry) => ({
      ...entry,
      score: cosineSimilarity(queryVector, entry.vector),
    }))
    .filter((e) => e.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Delete all vector entries for a given user (called on memory clear).
 */
export async function clearUserVectors(userName: string): Promise<void> {
  const store = (await loadVectorStore()).filter(
    (e) => e.metadata.userName !== userName
  );
  await saveVectorStore(store);
}

/**
 * Delete ALL vector entries (called on full history clear).
 */
export async function clearAllVectors(): Promise<void> {
  await getStorageBackend().clearVectors();
}

/**
 * Return basic stats about the vector store for a given user.
 */
export async function getVectorStats(userName: string) {
  const store = await loadVectorStore();
  const userEntries = store.filter((e) => e.metadata.userName === userName);
  return {
    totalEntries: store.length,
    userEntries: userEntries.length,
    oldestEntry: userEntries[0]?.metadata.timestamp ?? null,
    newestEntry: userEntries[userEntries.length - 1]?.metadata.timestamp ?? null,
  };
}

// ─── Manual seeding ───────────────────────────────────────────────────────────

export interface SeedEntry {
  /** The text to embed and store */
  text: string;
  /** Optional stable id — if omitted, a hash of the text is used (idempotent) */
  id?: string;
  /** Treat as user fact or assistant knowledge (default: "assistant") */
  speaker?: "user" | "assistant";
}

/**
 * Seed the RAG with a list of static facts, preferences, or knowledge snippets.
 *
 * This is idempotent: entries with the same id (or same text hash) are skipped
 * if they already exist, so it's safe to call on every app start.
 *
 * @example
 * await seedRAG("Marie", [
 *   { text: "L'utilisateur travaille en tant que designer UX." },
 *   { text: "Réunion d'équipe tous les lundis à 10h.", speaker: "user" },
 *   { text: "Préfère les réponses courtes et sans jargon technique." },
 * ]);
 */
export async function seedRAG(
  userName: string,
  entries: SeedEntry[]
): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Stable id: use provided id or a simple hash of the text
    const id =
      entry.id ??
      `seed_${userName}_${entry.text
        .toLowerCase()
        .replace(/\s+/g, "_")
        .slice(0, 48)}`;

    const store = await loadVectorStore();
    if (store.some((e) => e.id === id)) {
      skipped++;
      continue;
    }

    await embedAndStore(entry.text, {
      sessionId: "seed",
      userName,
      speaker: entry.speaker ?? "assistant",
      timestamp: Date.now(),
    });

    // Override the auto-generated id with our stable one
    const updated = await loadVectorStore();
    const last = updated[updated.length - 1];
    if (last && last.id !== id) {
      last.id = id;
      try {
        await saveVectorStore(updated.slice(-MAX_VECTOR_ENTRIES));
      } catch {}
    }

    seeded++;
  }

  console.log(`[RAG Seed] ${seeded} entrées ajoutées, ${skipped} ignorées (déjà présentes).`);
  return { seeded, skipped };
}

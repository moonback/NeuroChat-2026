/**
 * Vector Store — Client-side RAG for NeuroChat
 *
 * Stores text embeddings in localStorage and provides cosine-similarity
 * search over the full conversation history.
 *
 * Embeddings are generated with Transformers.js inside a dedicated Web Worker
 * so model loading and inference do not block the renderer UI thread.
 */

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
/** Modèle de Transformers.js — Multilingue pour un meilleur support du Français */
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
/** Clé localStorage pour suivre le modèle utilisé et détecter les incompatibilités */
const MODEL_STORE_KEY = "neurochat_vector_model";

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function loadVectorStore(): Promise<VectorEntry[]> {
  try {
    const currentModel = localStorage.getItem(MODEL_STORE_KEY);
    
    // Si le modèle a changé (ex: passage de Gemini à Transformers), on vide le store car les vecteurs sont incompatibles
    if (currentModel && currentModel !== EMBEDDING_MODEL) {
      console.warn(`[VectorStore] ⚠️ Changement de modèle détecté (${currentModel} -> ${EMBEDDING_MODEL}). Nettoyage des vecteurs incompatibles.`);
      await clearAllVectors();
      localStorage.setItem(MODEL_STORE_KEY, EMBEDDING_MODEL);
      return [];
    }

    if (!currentModel) {
      localStorage.setItem(MODEL_STORE_KEY, EMBEDDING_MODEL);
    }

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
    const dbEntries = limited.map(e => ({
      id: e.id,
      text: e.text,
      vector: e.vector,
      sessionId: e.metadata.sessionId,
      userName: e.metadata.userName,
      speaker: e.metadata.speaker,
      timestamp: e.metadata.timestamp
    }));
    await getStorageBackend().saveVectors(dbEntries);
    console.log("[VectorStore] ✅ Vecteurs sauvegardés avec succès (batch)");
  } catch (error) {
    console.error("[VectorStore] ❌ Échec de la sauvegarde:", error);
  }
}

// Worker singleton for embedding generation. The Transformers.js backend and model
// stay off the UI thread and are loaded inside the worker on first use.
type EmbeddingWorkerResponse = {
  id: number;
  type: "embedding";
  vector: number[] | null;
  error?: string;
};

const EMBEDDING_WORKER_TIMEOUT_MS = 120_000;

let embeddingWorker: Worker | null = null;
let embeddingRequestId = 0;
const pendingEmbeddingRequests = new Map<
  number,
  { resolve: (vector: number[] | null) => void; reject: (error: Error) => void; timeoutId: ReturnType<typeof setTimeout> }
>();

function rejectPendingEmbeddingRequests(error: Error): void {
  for (const [id, pending] of pendingEmbeddingRequests) {
    clearTimeout(pending.timeoutId);
    pending.reject(error);
    pendingEmbeddingRequests.delete(id);
  }
}

function resetEmbeddingWorker(error?: Error): void {
  if (embeddingWorker) {
    embeddingWorker.terminate();
    embeddingWorker = null;
  }

  if (error) {
    rejectPendingEmbeddingRequests(error);
  }
}

function getEmbeddingWorker(): Worker {
  if (typeof Worker === "undefined") {
    throw new Error("Embedding Worker unavailable in this environment");
  }

  if (!embeddingWorker) {
    console.log(`[VectorStore] 🧠 Démarrage du worker Transformers: ${EMBEDDING_MODEL}...`);
    embeddingWorker = new Worker(new URL("./embeddingWorker.ts", import.meta.url), {
      type: "module",
      name: "neurochat-embedding-worker",
    });

    embeddingWorker.onmessage = (event: MessageEvent<EmbeddingWorkerResponse>) => {
      const response = event.data;
      if (!response || response.type !== "embedding") return;

      const pending = pendingEmbeddingRequests.get(response.id);
      if (!pending) return;

      clearTimeout(pending.timeoutId);
      pendingEmbeddingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error));
        return;
      }

      pending.resolve(response.vector);
    };

    embeddingWorker.onerror = (event) => {
      const message = event.message || "Embedding worker failed";
      resetEmbeddingWorker(new Error(message));
    };

    embeddingWorker.onmessageerror = () => {
      resetEmbeddingWorker(new Error("Embedding worker sent an unreadable message"));
    };
  }

  return embeddingWorker;
}

function requestWorkerEmbedding(text: string): Promise<number[] | null> {
  const worker = getEmbeddingWorker();
  const id = ++embeddingRequestId;

  return new Promise<number[] | null>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingEmbeddingRequests.delete(id);
      reject(new Error("Embedding worker timed out"));
    }, EMBEDDING_WORKER_TIMEOUT_MS);

    pendingEmbeddingRequests.set(id, { resolve, reject, timeoutId });

    try {
      worker.postMessage({ id, type: "embed", text });
    } catch (error) {
      clearTimeout(timeoutId);
      pendingEmbeddingRequests.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Generate an embedding vector for the given text using the embedding Worker.
 * Returns null if the call fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    console.log(`[VectorStore] 🔄 Génération d'embedding (worker) pour: "${text.slice(0, 50)}..."`);
    const embedding = await requestWorkerEmbedding(text);

    if (embedding && embedding.length > 0) {
      console.log(`[VectorStore] ✅ Embedding généré (${embedding.length} dimensions)`);
      return embedding;
    }

    console.warn("[VectorStore] ⚠️ Aucun embedding retourné par le worker");
    return null;
  } catch (error) {
    console.error("[VectorStore] ❌ Échec de la génération d'embedding via worker:", error);
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
export async function addVectorEntry(entry: VectorEntry, existingStore?: VectorEntry[]): Promise<void> {
  const store = existingStore ?? await loadVectorStore();
  if (store.some((e) => e.id === entry.id)) return; // deduplicate

  const dbEntry = {
    id: entry.id,
    text: entry.text,
    vector: entry.vector,
    sessionId: entry.metadata.sessionId,
    userName: entry.metadata.userName,
    speaker: entry.metadata.speaker,
    timestamp: entry.metadata.timestamp,
  };

  if (store.length < MAX_VECTOR_ENTRIES) {
    await getStorageBackend().addVector(dbEntry);
    return;
  }

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

  // Skip before doing expensive embedding work if the turn is already indexed.
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
  await addVectorEntry({ id, text, vector, metadata }, store);
}

/**
 * Calculate a freshness multiplier (0.8 to 1.0) based on how recent the entry is.
 * Halflife is set to 30 days — old memories still matter but recent ones get a slight boost.
 */
function calculateFreshness(timestamp: number): number {
  const now = Date.now();
  const diffDays = (now - timestamp) / (1000 * 60 * 60 * 24);
  const halflifeDays = 30;
  
  // We use 0.8 as the floor so old entries aren't completely ignored if similarity is high
  const decay = Math.pow(0.5, diffDays / halflifeDays);
  return 0.8 + (0.2 * decay);
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
    .map((entry) => {
      const similarity = cosineSimilarity(queryVector, entry.vector);
      const freshness = calculateFreshness(entry.metadata.timestamp);
      return {
        ...entry,
        score: similarity * freshness,
      };
    })
    .filter((e) => e.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Delete all vector entries for a given user (called on memory clear).
 */
export async function clearUserVectors(userName: string): Promise<void> {
  await getStorageBackend().clearVectors(userName);
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

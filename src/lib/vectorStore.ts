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
import { pipeline, env } from "@xenova/transformers";

// Configuration pour environnement Electron/Vite
env.allowLocalModels = false; // Évite de chercher les modèles sur le serveur Vite local (404/HTML)
env.allowRemoteModels = true; // Force l'utilisation du CDN Hugging Face
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';
env.useBrowserCache = true;

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
    /** Confidence score (0-1) provided at creation time */
    confidence?: number;
    /** Sensitivity level to control usage in different contexts */
    sensitivity?: "low" | "medium" | "high";
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum entries kept in the vector store (older ones are pruned) */
const MAX_VECTOR_ENTRIES = 500;

/** 
 * Local embedding model versioning.
 * Changing this will force clear old incompatible vectors.
 * Gemini was v1 (768d), all-MiniLM-L6-v2 is v2 (384d).
 */
const VECTOR_STORE_VERSION = "v2";
const LOCAL_MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

/** Global pipeline singleton for transformers.js */
let extractor: any = null;
let isModelLoading = false;

/** Initialize the local embedding model */
async function getExtractor() {
  if (extractor) return extractor;
  if (isModelLoading) {
    // Wait for existing load
    while (isModelLoading) await new Promise(r => setTimeout(r, 100));
    return extractor;
  }

  isModelLoading = true;
  try {
    console.log(`[VectorStore] 🧠 Chargement du modèle local (${LOCAL_MODEL_NAME})...`);
    extractor = await pipeline("feature-extraction", LOCAL_MODEL_NAME);
    console.log("[VectorStore] ✅ Modèle local prêt !");
    return extractor;
  } catch (err) {
    console.error("[VectorStore] ❌ Échec du chargement du modèle local:", err);
    throw err;
  } finally {
    isModelLoading = false;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function loadVectorStore(): Promise<VectorEntry[]> {
  try {
    // Check version and clear if incompatible
    const currentVersion = localStorage.getItem("neurochat_vector_version");
    if (currentVersion !== VECTOR_STORE_VERSION) {
      console.warn(`[VectorStore] 🔄 Migration version ${currentVersion} -> ${VECTOR_STORE_VERSION}. Nettoyage des anciens vecteurs.`);
      await clearAllVectors();
      localStorage.setItem("neurochat_vector_version", VECTOR_STORE_VERSION);
      return [];
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

// ─── Embedding generation ─────────────────────────────────────────────────────

/**
 * Generate an embedding vector for the given text using local transformers.js model.
 * Completely free, private, and unlimited.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const extract = await getExtractor();
    const output = await extract(text, { pooling: "mean", normalize: true });
    const vector = Array.from(output.data) as number[];
    return vector;
  } catch (error) {
    console.error("[VectorStore] ❌ Échec de la génération d'embedding locale:", error);
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

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const scored = store
    .map((entry) => {
      const similarity = cosineSimilarity(queryVector, entry.vector);
      
      // Decay factor: starts at 1.0, drops to 0.7 over 30 days
      const age = now - entry.metadata.timestamp;
      const decay = Math.max(0.7, 1 - (age / THIRTY_DAYS) * 0.3);
      
      // Incorporate confidence (default to 0.9 if not provided)
      const confidence = entry.metadata.confidence ?? 0.9;
      
      // Combined weighted score
      const score = (similarity * 0.6) + (decay * 0.3) + (confidence * 0.1);

      return {
        ...entry,
        score,
        baseSimilarity: similarity,
      };
    })
    .filter((e) => e.baseSimilarity >= threshold)
    .sort((a, b) => b.score - a.score);

  return deduplicateAndResolveConflicts(scored).slice(0, topK);
}

/**
 * Deduplicate results and resolve conflicts by preferring higher scores (newer/higher confidence).
 */
function deduplicateAndResolveConflicts<T extends VectorEntry & { score: number }>(entries: T[]): T[] {
  const seen = new Map<string, T>();
  
  for (const entry of entries) {
    // Basic deduplication by text normalization
    const key = entry.text.toLowerCase().trim().slice(0, 100);
    const existing = seen.get(key);
    
    if (!existing || entry.score > existing.score) {
      seen.set(key, entry);
    }
  }
  
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
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

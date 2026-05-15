/**
 * Conversation Summary System
 *
 * Generates AI-powered summaries of individual sessions and weekly digests
 * using the Gemini text generation API.
 *
 * All summaries are stored in localStorage alongside the session data and
 * injected into the system prompt to give the assistant long-term awareness.
 */

import { ConversationSession, ConversationTurn } from "./conversationMemory";
import { getStorageBackend } from "./storage";
import { chatWithOpenRouter } from "./OpenRouterService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklySummary {
  /** ISO week identifier: "2026-W20" */
  weekId: string;
  /** Human-readable date range: "12–18 mai 2026" */
  dateRange: string;
  /** AI-generated summary text */
  text: string;
  /** Key topics extracted from the week */
  topics: string[];
  /** Timestamp of generation */
  generatedAt: number;
  /** Number of sessions included */
  sessionCount: number;
  /** Total turns included */
  turnCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKLY_SUMMARIES_KEY = "neurochat_v2_weekly_summaries";
const SUMMARY_COOLDOWN_KEY = "neurochat_v2_summary_cooldown";
/** Minimum turns in a session before we bother summarising it */
const MIN_TURNS_FOR_SUMMARY = 2;
const RETRY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return an ISO week string like "2026-W20" for a given date */
export function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Format a date range string for a week */
function formatWeekRange(weekId: string): string {
  const [year, week] = weekId.split("-W").map(Number);
  // Monday of that ISO week
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `${fmt(monday)} – ${fmt(sunday)} ${year}`;
}

/** Format a session's turns into a readable transcript */
function formatTranscript(
  turns: ConversationTurn[],
  userName: string
): string {
  return turns
    .map((t) => {
      const speaker = t.speaker === "user" ? userName : "Assistant";
      return `${speaker}: ${t.message}`;
    })
    .join("\n");
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function loadWeeklySummaries(): Promise<WeeklySummary[]> {
  try {
    return await getStorageBackend().loadSummaries() as WeeklySummary[];
  } catch {
    return [];
  }
}

async function saveWeeklySummaries(summaries: WeeklySummary[]): Promise<void> {
  try {
    // Keep last 12 weeks
    const limited = summaries.slice(-12);
    await getStorageBackend().clearSummaries();
    for (const summary of limited) await getStorageBackend().saveSummary(summary);
  } catch (e) {
    console.error("[Summary] Failed to save weekly summaries:", e);
  }
}

export async function getWeeklySummary(weekId: string): Promise<WeeklySummary | null> {
  return (await loadWeeklySummaries()).find((s) => s.weekId === weekId) ?? null;
}

export async function clearWeeklySummaries(): Promise<void> {
  await getStorageBackend().clearSummaries();
}

// ─── AI Generation ────────────────────────────────────────────────────────────

/**
 * Generate a short summary for a single session and store it on the session object.
 * Returns the summary text, or null if generation failed or was skipped.
 */
export async function generateSessionSummary(
  session: ConversationSession,
  userName: string
): Promise<string | null> {
  if (session.turns.length < MIN_TURNS_FOR_SUMMARY) return null;

  const transcript = formatTranscript(session.turns, userName);
  const date = new Date(session.startTime).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const prompt = [
    `Tu es un assistant qui résume des conversations. Voici une conversation du ${date} entre ${userName} et son assistant NeuroChat.`,
    "",
    "CONVERSATION :",
    transcript,
    "",
    "Génère un résumé factuel en 2-3 phrases maximum en français. Mentionne les sujets principaux abordés et toute action ou décision notable. Sois concis et objectif. Ne commence pas par 'Dans cette conversation'.",
  ].join("\n");

  try {
    console.log("[Summary] Generating session summary via OpenRouter...");
    const response = await chatWithOpenRouter([{ role: "user", content: prompt }]);
    return response?.trim() ?? null;
  } catch (err) {
    console.error(`[Summary] Session summary generation failed (OpenRouter) for session ${session.id}:`, err);
    return null;
  }
}

/**
 * Generate (or regenerate) the weekly summary for the given week.
 * Aggregates all sessions from that week for the given user.
 *
 * @param sessions  All sessions for the user (filtered internally by week)
 * @param userName  The user's name
 * @param weekId    ISO week string (default: current week)
 */
export async function generateWeeklySummary(
  sessions: ConversationSession[],
  userName: string,
  weekId?: string
): Promise<WeeklySummary | null> {
  const targetWeek = weekId ?? getWeekId(new Date());

  // Filter sessions belonging to this week
  const weekSessions = sessions.filter(
    (s) => getWeekId(new Date(s.startTime)) === targetWeek
  );

  if (weekSessions.length === 0) return null;

  const totalTurns = weekSessions.reduce((n, s) => n + s.turns.length, 0);
  if (totalTurns < MIN_TURNS_FOR_SUMMARY) {
    console.log(`[Summary] Skipping weekly summary for ${targetWeek}: too few turns (${totalTurns}/${MIN_TURNS_FOR_SUMMARY})`);
    return null;
  }

  // Build a condensed multi-session transcript
  const transcriptParts = weekSessions.map((s) => {
    const date = new Date(s.startTime).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const lines = formatTranscript(s.turns.slice(-20), userName); // cap per session
    return `--- ${date} ---\n${lines}`;
  });

  const fullTranscript = transcriptParts.join("\n\n");
  const dateRange = formatWeekRange(targetWeek);

  const prompt = [
    `Tu es NeuroChat Pro, l'assistant stratégique personnel de ${userName}.`,
    `Ta mission est d'analyser l'activité de la semaine du ${dateRange} pour en extraire une synthèse intelligente et motivante.`,
    "",
    "TRANSCRIPTIONS DE LA SEMAINE :",
    fullTranscript,
    "",
    "DIRECTIVES DE RÉDACTION :",
    "- Ton : Professionnel, analytique, mais encourageant.",
    "- Résumé : Synthétise les avancées majeures, les blocages rencontrés et l'état d'esprit global de ${userName}.",
    "- Thèmes : Identifie les 3 à 5 domaines d'intérêt ou projets récurrents.",
    "- Insight : Ajoute une observation pertinente sur un schéma répétitif ou une opportunité d'amélioration.",
    "",
    'Réponds STRICTEMENT au format JSON suivant :',
    '{',
    '  "summary": "Une synthèse fluide et structurée (environ 100-150 mots).",',
    '  "topics": ["Thème 1", "Thème 2", "Thème 3"]',
    '}',
  ].join("\n");

  try {
    console.log("[Summary] Generating weekly summary via OpenRouter...");
    const response = await chatWithOpenRouter([{ role: "user", content: prompt }]);

    const raw = response?.trim() ?? "";
    // Strip potential markdown code fences
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr) as { summary: string; topics: string[] };

    const weeklySummary: WeeklySummary = {
      weekId: targetWeek,
      dateRange,
      text: parsed.summary,
      topics: parsed.topics ?? [],
      generatedAt: Date.now(),
      sessionCount: weekSessions.length,
      turnCount: totalTurns,
    };

    // Persist
    const existing = (await loadWeeklySummaries()).filter((s) => s.weekId !== targetWeek);
    await saveWeeklySummaries([...existing, weeklySummary]);

    return weeklySummary;
  } catch (err) {
    console.error("[Summary] Weekly summary generation failed (OpenRouter):", err);
    return null;
  }
}

/**
 * Get the most recent weekly summary for a user, generating it if needed.
 * This is the main entry point called from the session hook.
 */
export async function getOrGenerateCurrentWeekSummary(
  sessions: ConversationSession[],
  userName: string
): Promise<WeeklySummary | null> {
  const currentWeek = getWeekId(new Date());
  const existing = await getWeeklySummary(currentWeek);

  // Regenerate if stale (older than 1 hour) or missing
  const isStale =
    !existing || Date.now() - existing.generatedAt > 60 * 60 * 1000;

  if (isStale) {
    // Check cooldown
    const lastAttempt = parseInt((await getStorageBackend().getItem(SUMMARY_COOLDOWN_KEY)) || "0");
    if (Date.now() - lastAttempt < RETRY_COOLDOWN_MS) {
      console.log("[Summary] Skipping generation: cooldown active (API failure recently)");
      return existing;
    }

    const totalTurns = sessions.reduce((n, s) => n + s.turns.length, 0);
    if (totalTurns < MIN_TURNS_FOR_SUMMARY) {
      // Don't even try if we know it will fail the threshold
      return existing;
    }

    const result = await generateWeeklySummary(sessions, userName, currentWeek);
    
    if (!result) {
      // Record failure timestamp to trigger cooldown
      await getStorageBackend().setItem(SUMMARY_COOLDOWN_KEY, Date.now().toString());
    } else {
      // Success, clear cooldown
      await getStorageBackend().removeItem(SUMMARY_COOLDOWN_KEY);
    }
    
    return result || existing;
  }

  return existing;
}

/**
 * Format a weekly summary into a prompt-ready context block.
 */
export function formatWeeklySummaryForPrompt(summary: WeeklySummary): string {
  return [
    "### SYNTHÈSE HEBDOMADAIRE",
    `Semaine du ${summary.dateRange} (${summary.sessionCount} session${summary.sessionCount > 1 ? "s" : ""}, ${summary.turnCount} échanges) :`,
    summary.text,
    summary.topics.length > 0
      ? `Thèmes clés : ${summary.topics.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

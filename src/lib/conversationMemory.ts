/**
 * Advanced Conversation Memory System
 * Handles session tracking, long-term memory summaries, and user preference extraction.
 *
 * RAG integration: each turn is asynchronously embedded and stored in the
 * vector store (vectorStore.ts) for semantic retrieval at query time.
 *
 * Summary integration: session and weekly summaries are generated via
 * conversationSummary.ts and stored alongside session data.
 */

console.log("[ConversationMemory] 🔧 Initialisation du module...");

import { embedAndStore, clearAllVectors } from "./vectorStore";
import { clearWeeklySummaries } from "./conversationSummary";
import { FeedbackCollector } from "./learning/feedbackCollector";
import { getLearningStorage } from "./learning/storage";
import { logAutoImprovement } from "./learning/autoImprovementLog";
import { runLearningCycleForUser } from "./learning/learningCycleRunner";
import type { LearningCycleStatus } from "./learning/types";

console.log("[ConversationMemory] ✅ Imports chargés");

export interface ConversationTurn {
  timestamp: number;
  speaker: "user" | "assistant" | "child" | "companion";
  message: string;
}

export interface ConversationSession {
  id: string;
  userName: string;
  startTime: number;
  endTime?: number;
  turns: ConversationTurn[];
  summary?: string;
  topic?: string;
}

export interface UserProfile {
  name: string;
  preferences: string[];
  lastActive: number;
  totalConversations: number;
}

const STORAGE_KEY = "neurochat_v2_memory";
const LEGACY_MAX_TURNS_IN_MEMORY = 20;
const USER_PROFILE_KEY = "neurochat_v2_user_profile";
const LEARNING_TURN_COUNTS_KEY = "neurochat_learning_turn_counts";
const MAX_SESSIONS = 50; // Increased storage for "pro" feel
const CONTEXT_WINDOW = 10;
const feedbackCollectors = new Map<string, FeedbackCollector>();

console.log("[ConversationMemory] ✅ Constantes initialisées");


export type AutomaticLearningRunner = (userName: string) => Promise<unknown>;

let automaticLearningRunner: AutomaticLearningRunner | null = null;

function getAutomaticLearningRunner(): AutomaticLearningRunner {
  if (!automaticLearningRunner) {
    automaticLearningRunner = (userName) => runLearningCycleForUser(userName);
  }
  return automaticLearningRunner;
}

export function setAutomaticLearningRunnerForTesting(runner: AutomaticLearningRunner): void {
  automaticLearningRunner = runner;
}

export function resetAutomaticLearningRunnerForTesting(): void {
  automaticLearningRunner = null;
}

export function shouldTriggerLearningCycle(turnCount: number, triggerAfterTurns: number): boolean {
  return triggerAfterTurns > 0 && turnCount > 0 && turnCount % triggerAfterTurns === 0;
}

function incrementLearningTurnCount(userName: string): number {
  try {
    const stored = localStorage.getItem(LEARNING_TURN_COUNTS_KEY);
    const counts = stored ? JSON.parse(stored) as Record<string, number> : {};
    const nextCount = (counts[userName] ?? 0) + 1;
    counts[userName] = nextCount;
    localStorage.setItem(LEARNING_TURN_COUNTS_KEY, JSON.stringify(counts));
    return nextCount;
  } catch {
    return 0;
  }
}

async function maybeTriggerAutomaticLearning(userName: string, turnCount: number): Promise<void> {
  const learningData = await getLearningStorage(userName).load();
  if (!learningData.config.enabled) {
    return;
  }
  if (!shouldTriggerLearningCycle(turnCount, learningData.config.triggerAfterTurns)) {
    return;
  }

  logAutoImprovement("Déclenchement", "Seuil de tours atteint — lancement cycle automatique", {
    userName,
    turnCount,
    triggerAfterTurns: learningData.config.triggerAfterTurns,
    maxCyclesPerDay: learningData.config.maxCyclesPerDay,
  });

  try {
    const status = (await getAutomaticLearningRunner()(userName)) as LearningCycleStatus;
    logAutoImprovement("Déclenchement", "Cycle automatique terminé", {
      userName,
      success: status.success,
      phase: status.phase,
      proposalsGenerated: status.proposalsGenerated,
      proposalsValidated: status.proposalsValidated,
      proposalsApplied: status.proposalsApplied,
      errors: status.errors,
      cycleId: status.cycleId,
    });
  } catch (err) {
    console.error("[ConversationMemory] ❌ Cycle d'auto-amélioration:", err);
    logAutoImprovement("Déclenchement", "Cycle automatique — exception", {
      userName,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function getFeedbackCollector(userName: string): FeedbackCollector {
  if (!feedbackCollectors.has(userName)) {
    feedbackCollectors.set(userName, new FeedbackCollector(userName));
  }
  return feedbackCollectors.get(userName)!;
}

/** Load all sessions from storage */
export function loadAllSessions(): ConversationSession[] {
  try {
    console.log("[ConversationMemory] 📂 Chargement des sessions depuis le stockage...");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[ConversationMemory] ℹ️ Aucune session trouvée dans le stockage");
      return [];
    }
    const sessions = JSON.parse(stored);
    console.log(`[ConversationMemory] ✅ ${sessions.length} session(s) chargée(s)`);
    return sessions;
  } catch (error) {
    console.error("[ConversationMemory] ❌ Échec du chargement de la mémoire:", error);
    return [];
  }
}

/** Save all sessions to storage */
function saveAllSessions(sessions: ConversationSession[]): void {
  try {
    console.log(`[ConversationMemory] 💾 Sauvegarde de ${sessions.length} session(s)...`);
    // Keep last N sessions
    const limited = sessions.slice(-MAX_SESSIONS);
    if (limited.length < sessions.length) {
      console.log(`[ConversationMemory] ⚠️ Limitation à ${MAX_SESSIONS} sessions (${sessions.length - limited.length} supprimée(s))`);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    console.log("[ConversationMemory] ✅ Sessions sauvegardées avec succès");
  } catch (error) {
    console.error("[ConversationMemory] ❌ Échec de la sauvegarde de la mémoire:", error);
  }
}

/** Get or create user profile */
export function getUserProfile(userName: string): UserProfile {
  try {
    console.log(`[ConversationMemory] 👤 Chargement du profil pour: ${userName}`);
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (stored) {
      const profiles = JSON.parse(stored);
      if (profiles[userName]) {
        console.log(`[ConversationMemory] ✅ Profil trouvé: ${profiles[userName].totalConversations} conversation(s)`);
        return profiles[userName];
      }
    }
    console.log(`[ConversationMemory] ℹ️ Création d'un nouveau profil pour: ${userName}`);
  } catch (e) {
    console.error("[ConversationMemory] ⚠️ Erreur lors du chargement du profil:", e);
  }
  
  return {
    name: userName,
    preferences: [],
    lastActive: Date.now(),
    totalConversations: 0
  };
}

/** Update user profile */
export function updateUserProfile(profile: UserProfile): void {
  try {
    console.log(`[ConversationMemory] 📝 Mise à jour du profil: ${profile.name}`);
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    const profiles = stored ? JSON.parse(stored) : {};
    profiles[profile.name] = {
      ...profile,
      lastActive: Date.now()
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profiles));
    console.log("[ConversationMemory] ✅ Profil mis à jour avec succès");
  } catch (e) {
    console.error("[ConversationMemory] ❌ Échec de la mise à jour du profil:", e);
  }
}

/** Get the current active session or create a new one */
export function getOrCreateCurrentSession(userName: string): ConversationSession {
  console.log(`[ConversationMemory] 🔍 Recherche de session active pour: ${userName}`);
  const sessions = loadAllSessions();
  const now = Date.now();
  
  // Find a session from the last 30 minutes for the same user
  const recentSession = sessions.find(s => 
    s.userName === userName && 
    (now - (s.endTime || s.startTime)) < 30 * 60 * 1000
  );

  if (recentSession) {
    console.log(`[ConversationMemory] ✅ Session active trouvée: ${recentSession.id} (${recentSession.turns.length} tours)`);
    return recentSession;
  }

  const newSession: ConversationSession = {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    userName,
    startTime: now,
    turns: []
  };
  console.log(`[ConversationMemory] 🆕 Nouvelle session créée: ${newSession.id}`);

  return newSession;
}

/** Add a turn to the memory */
export function addConversationTurn(
  userName: string,
  speaker: "user" | "assistant" | "child" | "companion",
  message: string
): void {
  console.log(`[ConversationMemory] 💬 Ajout d'un tour: ${speaker} (${message.length} caractères)`);
  const sessions = loadAllSessions();
  const currentSession = getOrCreateCurrentSession(userName);
  
  const turn: ConversationTurn = {
    timestamp: Date.now(),
    speaker,
    message
  };

  const sessionIndex = sessions.findIndex(s => s.id === currentSession.id);
  console.log(`[ConversationMemory] 📍 Index de session: ${sessionIndex}`);
  
  if (sessionIndex >= 0) {
    console.log(`[ConversationMemory] ➕ Ajout du tour à la session existante: ${sessions[sessionIndex].id}`);
    sessions[sessionIndex].turns.push(turn);
    sessions[sessionIndex].endTime = Date.now();
    // Simple topic extraction (first user message)
    if (!sessions[sessionIndex].topic && (speaker === "user" || speaker === "child")) {
      sessions[sessionIndex].topic = message.slice(0, 40) + (message.length > 40 ? "..." : "");
      console.log(`[ConversationMemory] 🏷️ Sujet défini: ${sessions[sessionIndex].topic}`);
    }
    console.log(`[ConversationMemory] 📊 Total tours dans la session: ${sessions[sessionIndex].turns.length}`);
    // RAG: embed and store the turn asynchronously (fire-and-forget)
    embedAndStore(message, {
      sessionId: sessions[sessionIndex].id,
      userName,
      speaker: speaker === "child" ? "user" : speaker === "companion" ? "assistant" : speaker,
      timestamp: turn.timestamp,
    });
  } else {
    console.log(`[ConversationMemory] 🆕 Ajout d'une nouvelle session: ${currentSession.id}`);
    currentSession.turns.push(turn);
    currentSession.endTime = Date.now();
    currentSession.topic = (speaker === "user" || speaker === "child") ? message.slice(0, 40) : "Discussion";
    sessions.push(currentSession);
    console.log(`[ConversationMemory] 📊 Total sessions: ${sessions.length}`);
    
    // Update profile stats
    const profile = getUserProfile(userName);
    profile.totalConversations += 1;
    updateUserProfile(profile);

    // RAG: embed and store the turn asynchronously (fire-and-forget)
    embedAndStore(message, {
      sessionId: currentSession.id,
      userName,
      speaker: speaker === "child" ? "user" : speaker === "companion" ? "assistant" : speaker,
      timestamp: turn.timestamp,
    });
  }

  const updatedSession = sessions.find(s => s.id === (sessionIndex >= 0 ? sessions[sessionIndex].id : currentSession.id));
  if (updatedSession && updatedSession.turns.length > LEGACY_MAX_TURNS_IN_MEMORY) {
    updatedSession.turns = updatedSession.turns.slice(-LEGACY_MAX_TURNS_IN_MEMORY);
  }
  const previousTurns = updatedSession ? updatedSession.turns.slice(0, -1) : [];
  const addedTurnIndex = updatedSession ? updatedSession.turns.length - 1 : 0;
  void getFeedbackCollector(userName).collectFromTurn(
    (updatedSession?.id ?? currentSession.id),
    addedTurnIndex,
    turn,
    previousTurns
  );

  saveAllSessions(sessions);

  const learningTurnCount = incrementLearningTurnCount(userName);
  void maybeTriggerAutomaticLearning(userName, learningTurnCount);
}

/** Build context for the AI prompt */
export function buildMemoryContext(userName: string): string {
  const sessions = loadAllSessions();
  const userSessions = sessions.filter(s => s.userName === userName).slice(-3); // Last 3 sessions
  
  if (userSessions.length === 0) return "C'est votre première conversation avec l'utilisateur aujourd'hui.";

  let context = "Historique récent :\n";
  userSessions.forEach(session => {
    const date = new Date(session.startTime).toLocaleDateString();
    context += `--- Session du ${date} ---\n`;
    if (session.summary) context += `Résumé : ${session.summary}\n`;
    
    const recentTurns = session.turns.slice(-CONTEXT_WINDOW);
    recentTurns.forEach(t => {
      context += `${(t.speaker === "user" || t.speaker === "child") ? userName : "Toi"}: ${t.message}\n`;
    });
  });

  return context;
}

/** Get stats for the UI */
export function getConversationStats(userName: string) {
  console.log(`[ConversationMemory] 📊 Calcul des statistiques pour: ${userName}`);
  const sessions = loadAllSessions().filter(s => s.userName === userName);
  const profile = getUserProfile(userName);
  
  const stats = {
    totalSessions: sessions.length || profile.totalConversations,
    totalTurns: sessions.reduce((acc, s) => acc + s.turns.length, 0),
    lastActive: profile.lastActive,
    lastConversationDate: sessions.length ? new Date(Math.max(...sessions.map(s => s.endTime || s.startTime))) : undefined,
    sessions: sessions.reverse() // Newest first for UI
  };
  
  console.log(`[ConversationMemory] ✅ Stats: ${stats.totalSessions} sessions, ${stats.totalTurns} tours`);
  return stats;
}

/** Clear all data (sessions + vector store + weekly summaries) */
export function clearConversationHistory(): void {
  console.log("[ConversationMemory] 🗑️ Effacement de tout l'historique des conversations...");
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem(LEARNING_TURN_COUNTS_KEY);
  clearAllVectors();
  clearWeeklySummaries();
  console.log("[ConversationMemory] ✅ Historique effacé avec succès");
}


/** Legacy API aliases retained for child/companion tests and older callers. */
export function loadConversationHistory(): ConversationSession[] {
  return loadAllSessions().map(session => ({
    ...session,
    childName: session.userName,
  } as ConversationSession & { childName: string }));
}

export function getCurrentSession(userName: string): ConversationSession & { childName: string } {
  const sessions = loadAllSessions();
  const session = getOrCreateCurrentSession(userName);
  if (!sessions.some(s => s.id === session.id)) {
    sessions.push(session);
    saveAllSessions(sessions);
  }
  return { ...session, childName: session.userName };
}

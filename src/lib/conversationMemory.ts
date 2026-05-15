/**
 * Advanced Conversation Memory System
 */
console.log("[ConversationMemory] 🔧 Initialisation du module...");

import { embedAndStore, clearAllVectors } from "./vectorStore";
import { clearWeeklySummaries } from "./conversationSummary";
import { FeedbackCollector } from "./learning/feedbackCollector";
import { getLearningStorage } from "./learning/storage";
import { logAutoImprovement } from "./learning/autoImprovementLog";
import { runLearningCycleForUser } from "./learning/learningCycleRunner";
import type { LearningCycleStatus } from "./learning/types";
import { getStorageBackend } from "./storage";

export interface ConversationTurn { timestamp: number; speaker: "user" | "assistant" | "child" | "companion"; message: string; }
export interface ConversationSession { id: string; userName: string; startTime: number; endTime?: number; turns: ConversationTurn[]; summary?: string; topic?: string; }
export interface UserProfile { name: string; preferences: string[]; lastActive: number; totalConversations: number; }
export interface ConversationStats { totalSessions: number; totalTurns: number; lastActive: number; lastConversationDate?: Date; sessions: ConversationSession[]; }

const USER_PROFILE_KEY = "neurochat_v2_user_profile";
const LEARNING_TURN_COUNTS_KEY = "neurochat_learning_turn_counts";
const LEGACY_MAX_TURNS_IN_MEMORY = 20;
const MAX_SESSIONS = 50;
const CONTEXT_WINDOW = 10;
const feedbackCollectors = new Map<string, FeedbackCollector>();

export type AutomaticLearningRunner = (userName: string) => Promise<unknown>;
let automaticLearningRunner: AutomaticLearningRunner | null = null;
function getAutomaticLearningRunner(): AutomaticLearningRunner { if (!automaticLearningRunner) automaticLearningRunner = (userName) => runLearningCycleForUser(userName); return automaticLearningRunner; }
export function setAutomaticLearningRunnerForTesting(runner: AutomaticLearningRunner): void { automaticLearningRunner = runner; }
export function resetAutomaticLearningRunnerForTesting(): void { automaticLearningRunner = null; }
export function shouldTriggerLearningCycle(turnCount: number, triggerAfterTurns: number): boolean { return triggerAfterTurns > 0 && turnCount > 0 && turnCount % triggerAfterTurns === 0; }

async function incrementLearningTurnCount(userName: string): Promise<number> {
  try {
    const stored = await getStorageBackend().getItem(LEARNING_TURN_COUNTS_KEY);
    const counts = stored ? JSON.parse(stored) as Record<string, number> : {};
    const nextCount = (counts[userName] ?? 0) + 1;
    counts[userName] = nextCount;
    await getStorageBackend().setItem(LEARNING_TURN_COUNTS_KEY, JSON.stringify(counts));
    return nextCount;
  } catch { return 0; }
}

async function maybeTriggerAutomaticLearning(userName: string, turnCount: number): Promise<void> {
  const learningData = await getLearningStorage(userName).load();
  if (!learningData.config.enabled || !shouldTriggerLearningCycle(turnCount, learningData.config.triggerAfterTurns)) return;
  try { await getAutomaticLearningRunner()(userName) as LearningCycleStatus; } catch (err) { console.error(err); }
}

function getFeedbackCollector(userName: string): FeedbackCollector {
  if (!feedbackCollectors.has(userName)) feedbackCollectors.set(userName, new FeedbackCollector(userName));
  return feedbackCollectors.get(userName)!;
}

export async function loadAllSessions(): Promise<ConversationSession[]> {
  try { return (await getStorageBackend().loadSessions()) as ConversationSession[]; } catch { return []; }
}

async function saveAllSessions(sessions: ConversationSession[]): Promise<void> {
  const limited = sessions.slice(-MAX_SESSIONS);
  await getStorageBackend().saveSessions(limited);
}

export async function getUserProfile(userName: string): Promise<UserProfile> {
  try {
    const profile = await getStorageBackend().getProfile(userName);
    if (profile) return profile as UserProfile;
  } catch {}
  return { name: userName, preferences: [], lastActive: Date.now(), totalConversations: 0 };
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  await getStorageBackend().setProfile({ ...profile, lastActive: Date.now() });
}

export async function getOrCreateCurrentSession(userName: string): Promise<ConversationSession> {
  const sessions = await loadAllSessions();
  const now = Date.now();
  const recentSession = sessions.find((s) => s.userName === userName && (now - (s.endTime || s.startTime)) < 30 * 60 * 1000);
  if (recentSession) return recentSession;
  return { id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`, userName, startTime: now, turns: [] };
}

export async function addConversationTurn(userName: string, speaker: "user" | "assistant" | "child" | "companion", message: string): Promise<void> {
  const sessions = await loadAllSessions();
  const currentSession = await getOrCreateCurrentSession(userName);
  const turn: ConversationTurn = { timestamp: Date.now(), speaker, message };
  const sessionIndex = sessions.findIndex((s) => s.id === currentSession.id);

  if (sessionIndex >= 0) {
    sessions[sessionIndex].turns.push(turn);
    sessions[sessionIndex].endTime = Date.now();
    if (!sessions[sessionIndex].topic && (speaker === "user" || speaker === "child")) sessions[sessionIndex].topic = message.slice(0, 40) + (message.length > 40 ? "..." : "");
    embedAndStore(message, { sessionId: sessions[sessionIndex].id, userName, speaker: speaker === "child" ? "user" : speaker === "companion" ? "assistant" : speaker, timestamp: turn.timestamp });
  } else {
    currentSession.turns.push(turn); currentSession.endTime = Date.now(); currentSession.topic = (speaker === "user" || speaker === "child") ? message.slice(0, 40) : "Discussion";
    sessions.push(currentSession);
    const profile = await getUserProfile(userName); profile.totalConversations += 1; await updateUserProfile(profile);
    embedAndStore(message, { sessionId: currentSession.id, userName, speaker: speaker === "child" ? "user" : speaker === "companion" ? "assistant" : speaker, timestamp: turn.timestamp });
  }

  const updatedSession = sessions.find((s) => s.id === (sessionIndex >= 0 ? sessions[sessionIndex].id : currentSession.id));
  if (updatedSession && updatedSession.turns.length > LEGACY_MAX_TURNS_IN_MEMORY) updatedSession.turns = updatedSession.turns.slice(-LEGACY_MAX_TURNS_IN_MEMORY);
  const previousTurns = updatedSession ? updatedSession.turns.slice(0, -1) : [];
  const addedTurnIndex = updatedSession ? updatedSession.turns.length - 1 : 0;
  void getFeedbackCollector(userName).collectFromTurn((updatedSession?.id ?? currentSession.id), addedTurnIndex, turn, previousTurns);

  await saveAllSessions(sessions);
  const learningTurnCount = await incrementLearningTurnCount(userName);
  void maybeTriggerAutomaticLearning(userName, learningTurnCount);
}

export async function buildMemoryContext(userName: string): Promise<string> {
  const sessions = await loadAllSessions();
  const userSessions = sessions.filter((s) => s.userName === userName).slice(-3);
  if (userSessions.length === 0) return "C'est votre première conversation avec l'utilisateur aujourd'hui.";
  let context = "Historique récent :\n";
  userSessions.forEach((session) => {
    context += `--- Session du ${new Date(session.startTime).toLocaleDateString()} ---\n`;
    if (session.summary) context += `Résumé : ${session.summary}\n`;
    session.turns.slice(-CONTEXT_WINDOW).forEach((t) => { context += `${(t.speaker === "user" || t.speaker === "child") ? userName : "Toi"}: ${t.message}\n`; });
  });
  return context;
}

export async function getConversationStats(userName: string): Promise<ConversationStats> {
  const sessions = (await loadAllSessions()).filter((s) => s.userName === userName);
  const profile = await getUserProfile(userName);
  return { totalSessions: sessions.length || profile.totalConversations, totalTurns: sessions.reduce((a, s) => a + s.turns.length, 0), lastActive: profile.lastActive, lastConversationDate: sessions.length ? new Date(Math.max(...sessions.map((s) => s.endTime || s.startTime))) : undefined, sessions: sessions.reverse() };
}

export async function clearConversationHistory(): Promise<void> {
  await getStorageBackend().clearSessions();
  await getStorageBackend().removeItem(USER_PROFILE_KEY);
  await getStorageBackend().removeItem(LEARNING_TURN_COUNTS_KEY);
  await clearAllVectors();
  await clearWeeklySummaries();
}

export async function loadConversationHistory(): Promise<ConversationSession[]> {
  return (await loadAllSessions()).map((session) => ({ ...session, childName: session.userName } as ConversationSession & { childName: string }));
}

export async function getCurrentSession(userName: string): Promise<ConversationSession & { childName: string }> {
  const sessions = await loadAllSessions();
  const session = await getOrCreateCurrentSession(userName);
  if (!sessions.some((s) => s.id === session.id)) { sessions.push(session); await saveAllSessions(sessions); }
  return { ...session, childName: session.userName };
}

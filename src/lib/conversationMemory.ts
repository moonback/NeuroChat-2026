/**
 * Conversation Memory System
 * Stores and retrieves conversation history to give the AI assistant memory
 */

export interface ConversationTurn {
  timestamp: number;
  speaker: "user" | "assistant";
  message: string;
}

export interface ConversationSession {
  userName: string;
  startTime: number;
  turns: ConversationTurn[];
}

const STORAGE_KEY = "neurochat_conversation_memory";
const MAX_TURNS_IN_MEMORY = 20;
const MAX_SESSIONS = 5;
const MAX_CONTEXT_TURNS = 8;
const MAX_RESPONSE_HISTORY = 5;

export function loadConversationHistory(): ConversationSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load conversation history:", error);
    return [];
  }
}

function saveConversationHistory(sessions: ConversationSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
}

export function getCurrentSession(userName: string): ConversationSession {
  const sessions = loadConversationHistory();
  const today = new Date().setHours(0, 0, 0, 0);

  const lastSession = sessions.find(
    (s) => s.userName === userName && new Date(s.startTime).setHours(0, 0, 0, 0) === today,
  );

  return lastSession ?? { userName, startTime: Date.now(), turns: [] };
}

export function addConversationTurn(
  userName: string,
  speaker: "user" | "assistant",
  message: string,
): void {
  const sessions = loadConversationHistory();
  const today = new Date().setHours(0, 0, 0, 0);

  let index = sessions.findIndex(
    (s) => s.userName === userName && new Date(s.startTime).setHours(0, 0, 0, 0) === today,
  );

  if (index < 0) {
    sessions.push({ userName, startTime: Date.now(), turns: [] });
    index = sessions.length - 1;
  }

  sessions[index].turns.push({ timestamp: Date.now(), speaker, message });
  if (sessions[index].turns.length > MAX_TURNS_IN_MEMORY) {
    sessions[index].turns = sessions[index].turns.slice(-MAX_TURNS_IN_MEMORY);
  }

  saveConversationHistory(sessions);
}

function normalizeForRepeatCheck(text: string): string {
  return text.toLowerCase().replace(/[!?.,;:]/g, "").replace(/\s+/g, " ").trim();
}

export function getRecentAssistantMessages(userName: string, limit = MAX_RESPONSE_HISTORY): string[] {
  if (!userName) return [];
  const currentSession = getCurrentSession(userName);
  return currentSession.turns
    .filter((turn) => turn.speaker === "assistant")
    .slice(-limit)
    .map((turn) => turn.message);
}

export function buildAntiRepeatContext(userName: string): string {
  const recentMessages = getRecentAssistantMessages(userName);
  if (recentMessages.length === 0) return "";

  const deduped = Array.from(new Set(recentMessages.map(normalizeForRepeatCheck))).slice(-3);
  if (deduped.length === 0) return "";

  return `Dernières formulations à éviter de répéter: ${deduped.join(" | ")}. Reformule avec des mots différents.`;
}

export function buildMemoryContext(userName: string): string {
  if (!userName) return "";

  const currentSession = getCurrentSession(userName);
  if (currentSession.turns.length === 0) {
    return "Première conversation du jour: accueil professionnel, clair et proactif.";
  }

  const recentTurns = currentSession.turns.slice(-MAX_CONTEXT_TURNS);
  const memoryLines = recentTurns.map((turn) => `${turn.speaker === "user" ? userName : "Toi"}: ${turn.message}`);

  return `Mémoire courte utile: ${memoryLines.join(" || ")}`;
}

export function clearConversationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear conversation history:", error);
  }
}

export function getConversationStats(userName: string): {
  totalSessions: number;
  totalTurns: number;
  lastConversationDate: Date | null;
} {
  const sessions = loadConversationHistory();
  const userSessions = sessions.filter((s) => s.userName === userName);
  const totalTurns = userSessions.reduce((sum, s) => sum + s.turns.length, 0);
  const lastSession = userSessions[userSessions.length - 1];

  return {
    totalSessions: userSessions.length,
    totalTurns,
    lastConversationDate: lastSession ? new Date(lastSession.startTime) : null,
  };
}

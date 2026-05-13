/**
 * Conversation Memory System
 * Stores and retrieves conversation history to give the AI companion memory
 */

export interface ConversationTurn {
  timestamp: number;
  speaker: "child" | "companion";
  message: string;
}

export interface ConversationSession {
  childName: string;
  startTime: number;
  turns: ConversationTurn[];
}

const STORAGE_KEY = "kidsvoice_conversation_memory";
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

export function getCurrentSession(childName: string): ConversationSession {
  const sessions = loadConversationHistory();
  const today = new Date().setHours(0, 0, 0, 0);

  const lastSession = sessions.find(
    (s) => s.childName === childName && new Date(s.startTime).setHours(0, 0, 0, 0) === today,
  );

  return lastSession ?? { childName, startTime: Date.now(), turns: [] };
}

export function addConversationTurn(
  childName: string,
  speaker: "child" | "companion",
  message: string,
): void {
  const sessions = loadConversationHistory();
  const today = new Date().setHours(0, 0, 0, 0);

  let index = sessions.findIndex(
    (s) => s.childName === childName && new Date(s.startTime).setHours(0, 0, 0, 0) === today,
  );

  if (index < 0) {
    sessions.push({ childName, startTime: Date.now(), turns: [] });
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

export function getRecentCompanionMessages(childName: string, limit = MAX_RESPONSE_HISTORY): string[] {
  if (!childName) return [];
  const currentSession = getCurrentSession(childName);
  return currentSession.turns
    .filter((turn) => turn.speaker === "companion")
    .slice(-limit)
    .map((turn) => turn.message);
}

export function buildAntiRepeatContext(childName: string): string {
  const recentMessages = getRecentCompanionMessages(childName);
  if (recentMessages.length === 0) return "";

  const deduped = Array.from(new Set(recentMessages.map(normalizeForRepeatCheck))).slice(-3);
  if (deduped.length === 0) return "";

  return `Dernières formulations à éviter de répéter: ${deduped.join(" | ")}. Reformule avec des mots différents.`;
}

export function buildMemoryContext(childName: string): string {
  if (!childName) return "";

  const currentSession = getCurrentSession(childName);
  if (currentSession.turns.length === 0) {
    return "Première conversation du jour: accueil chaleureux, simple et rassurant.";
  }

  const recentTurns = currentSession.turns.slice(-MAX_CONTEXT_TURNS);
  const memoryLines = recentTurns.map((turn) => `${turn.speaker === "child" ? childName : "Toi"}: ${turn.message}`);

  return `Mémoire courte utile: ${memoryLines.join(" || ")}`;
}

export function clearConversationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear conversation history:", error);
  }
}

export function getConversationStats(childName: string): {
  totalSessions: number;
  totalTurns: number;
  lastConversationDate: Date | null;
} {
  const sessions = loadConversationHistory();
  const childSessions = sessions.filter((s) => s.childName === childName);
  const totalTurns = childSessions.reduce((sum, s) => sum + s.turns.length, 0);
  const lastSession = childSessions[childSessions.length - 1];

  return {
    totalSessions: childSessions.length,
    totalTurns,
    lastConversationDate: lastSession ? new Date(lastSession.startTime) : null,
  };
}

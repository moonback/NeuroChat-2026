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
import { embedAndStore, clearAllVectors } from "./vectorStore";
import { clearWeeklySummaries } from "./conversationSummary";

export interface ConversationTurn {
  timestamp: number;
  speaker: "user" | "assistant";
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
const USER_PROFILE_KEY = "neurochat_v2_user_profile";
const MAX_SESSIONS = 50; // Increased storage for "pro" feel
const CONTEXT_WINDOW = 10;

/** Load all sessions from storage */
export function loadAllSessions(): ConversationSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load memory:", error);
    return [];
  }
}

/** Save all sessions to storage */
function saveAllSessions(sessions: ConversationSession[]): void {
  try {
    // Keep last N sessions
    const limited = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to save memory:", error);
  }
}

/** Get or create user profile */
export function getUserProfile(userName: string): UserProfile {
  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (stored) {
      const profiles = JSON.parse(stored);
      if (profiles[userName]) return profiles[userName];
    }
  } catch (e) {}
  
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
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    const profiles = stored ? JSON.parse(stored) : {};
    profiles[profile.name] = {
      ...profile,
      lastActive: Date.now()
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profiles));
  } catch (e) {}
}

/** Get the current active session or create a new one */
export function getOrCreateCurrentSession(userName: string): ConversationSession {
  const sessions = loadAllSessions();
  const now = Date.now();
  
  // Find a session from the last 30 minutes for the same user
  const recentSession = sessions.find(s => 
    s.userName === userName && 
    (now - (s.endTime || s.startTime)) < 30 * 60 * 1000
  );

  if (recentSession) return recentSession;

  const newSession: ConversationSession = {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    userName,
    startTime: now,
    turns: []
  };

  return newSession;
}

/** Add a turn to the memory */
export function addConversationTurn(
  userName: string,
  speaker: "user" | "assistant",
  message: string
): void {
  const sessions = loadAllSessions();
  const currentSession = getOrCreateCurrentSession(userName);
  
  const turn: ConversationTurn = {
    timestamp: Date.now(),
    speaker,
    message
  };

  const sessionIndex = sessions.findIndex(s => s.id === currentSession.id);
  
  if (sessionIndex >= 0) {
    sessions[sessionIndex].turns.push(turn);
    sessions[sessionIndex].endTime = Date.now();
    // Simple topic extraction (first user message)
    if (!sessions[sessionIndex].topic && speaker === "user") {
      sessions[sessionIndex].topic = message.slice(0, 40) + (message.length > 40 ? "..." : "");
    }
    // RAG: embed and store the turn asynchronously (fire-and-forget)
    embedAndStore(message, {
      sessionId: sessions[sessionIndex].id,
      userName,
      speaker,
      timestamp: turn.timestamp,
    });
  } else {
    currentSession.turns.push(turn);
    currentSession.endTime = Date.now();
    currentSession.topic = speaker === "user" ? message.slice(0, 40) : "Discussion";
    sessions.push(currentSession);
    
    // Update profile stats
    const profile = getUserProfile(userName);
    profile.totalConversations += 1;
    updateUserProfile(profile);

    // RAG: embed and store the turn asynchronously (fire-and-forget)
    embedAndStore(message, {
      sessionId: currentSession.id,
      userName,
      speaker,
      timestamp: turn.timestamp,
    });
  }

  saveAllSessions(sessions);
}

/** Build context for the AI prompt */
export function buildMemoryContext(userName: string): string {
  const sessions = loadAllSessions();
  const userSessions = sessions.filter(s => s.userName === userName).slice(-3); // Last 3 sessions
  
  if (userSessions.length === 0) return "C'est votre première interaction avec l'utilisateur aujourd'hui.";

  let context = "Historique récent :\n";
  userSessions.forEach(session => {
    const date = new Date(session.startTime).toLocaleDateString();
    context += `--- Session du ${date} ---\n`;
    if (session.summary) context += `Résumé : ${session.summary}\n`;
    
    const recentTurns = session.turns.slice(-CONTEXT_WINDOW);
    recentTurns.forEach(t => {
      context += `${t.speaker === "user" ? userName : "Assistant"}: ${t.message}\n`;
    });
  });

  return context;
}

/** Get stats for the UI */
export function getConversationStats(userName: string) {
  const sessions = loadAllSessions().filter(s => s.userName === userName);
  const profile = getUserProfile(userName);
  
  return {
    totalSessions: profile.totalConversations,
    totalTurns: sessions.reduce((acc, s) => acc + s.turns.length, 0),
    lastActive: profile.lastActive,
    sessions: sessions.reverse() // Newest first for UI
  };
}

/** Clear all data (sessions + vector store + weekly summaries) */
export function clearConversationHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  clearAllVectors();
  clearWeeklySummaries();
}

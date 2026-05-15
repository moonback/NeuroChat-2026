import type { AgentTraceEntry } from '../agent/traceStore';
import type { ConversationSession, UserProfile } from '../conversationMemory';
import type { WeeklySummary } from '../conversationSummary';

export interface VectorDbEntry {
  id: string;
  text: string;
  vector: number[];
  sessionId: string;
  userName: string;
  speaker: 'user' | 'assistant';
  timestamp: number;
}

export interface MigrationPayload {
  vectors: unknown[];
  sessions: ConversationSession[];
  profiles: Record<string, UserProfile>;
  summaries: WeeklySummary[];
  traces: AgentTraceEntry[];
  kv: Record<string, string>;
}

export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;

  loadVectors(userName?: string): Promise<VectorDbEntry[]>;
  addVector(entry: VectorDbEntry): Promise<void>;
  clearVectors(userName?: string): Promise<void>;

  loadSessions(): Promise<ConversationSession[]>;
  saveSessions(sessions: ConversationSession[]): Promise<void>;
  clearSessions(): Promise<void>;

  getProfile(userName: string): Promise<UserProfile | null>;
  setProfile(profile: UserProfile): Promise<void>;

  loadLearning(userId: string): Promise<string | null>;
  saveLearning(userId: string, encryptedData: string, lastUpdated: number): Promise<void>;
  clearLearning(userId: string): Promise<void>;

  loadSummaries(): Promise<WeeklySummary[]>;
  saveSummary(summary: WeeklySummary): Promise<void>;
  clearSummaries(): Promise<void>;

  saveTrace(trace: AgentTraceEntry): Promise<void>;
  loadTraces(): Promise<AgentTraceEntry[]>;

  migrate(payload: MigrationPayload): Promise<void>;
}

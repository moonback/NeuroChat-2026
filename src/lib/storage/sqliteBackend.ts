import type { AgentTraceEntry } from '../agent/traceStore';
import type { ConversationSession, UserProfile } from '../conversationMemory';
import type { WeeklySummary } from '../conversationSummary';
import type { MigrationPayload, StorageBackend, VectorDbEntry } from './storageBackend';

export class SqliteBackend implements StorageBackend {
  async getItem(key: string): Promise<string | null> { return window.neurochatElectron!.db!.get(key); }
  async setItem(key: string, value: string): Promise<void> { await window.neurochatElectron!.db!.set(key, value); }
  async removeItem(key: string): Promise<void> { await window.neurochatElectron!.db!.delete(key); }

  async loadVectors(userName?: string): Promise<VectorDbEntry[]> { return window.neurochatElectron!.db!.loadVectors(userName); }
  async addVector(entry: VectorDbEntry): Promise<void> { await window.neurochatElectron!.db!.addVector(entry); }
  async saveVectors(entries: VectorDbEntry[]): Promise<void> { await window.neurochatElectron!.db!.saveVectors(entries); }
  async clearVectors(userName?: string): Promise<void> { await window.neurochatElectron!.db!.clearVectors(userName); }

  async loadSessions(): Promise<ConversationSession[]> { return window.neurochatElectron!.db!.loadSessions(); }
  async saveSessions(sessions: ConversationSession[]): Promise<void> { await window.neurochatElectron!.db!.saveSessions(sessions); }
  async clearSessions(): Promise<void> { await window.neurochatElectron!.db!.clearSessions(); }

  async getProfile(userName: string): Promise<UserProfile | null> { return window.neurochatElectron!.db!.getProfile(userName); }
  async setProfile(profile: UserProfile): Promise<void> { await window.neurochatElectron!.db!.setProfile(profile); }

  async loadLearning(userId: string): Promise<string | null> { return window.neurochatElectron!.db!.loadLearning(userId); }
  async saveLearning(userId: string, encryptedData: string, lastUpdated: number): Promise<void> { await window.neurochatElectron!.db!.saveLearning(userId, encryptedData, lastUpdated); }
  async clearLearning(userId: string): Promise<void> { await window.neurochatElectron!.db!.clearLearning(userId); }

  async loadSummaries(): Promise<WeeklySummary[]> { return window.neurochatElectron!.db!.loadSummaries(); }
  async saveSummary(summary: WeeklySummary): Promise<void> { await window.neurochatElectron!.db!.saveSummary(summary); }
  async clearSummaries(): Promise<void> { await window.neurochatElectron!.db!.clearSummaries(); }

  async saveTrace(trace: AgentTraceEntry): Promise<void> { await window.neurochatElectron!.db!.saveTrace(trace); }
  async loadTraces(): Promise<AgentTraceEntry[]> { return window.neurochatElectron!.db!.loadTraces(); }
  async clearTraces(): Promise<void> { await window.neurochatElectron!.db!.clearTraces(); }

  async migrate(payload: MigrationPayload): Promise<void> { await window.neurochatElectron!.db!.migrate(payload); }
}

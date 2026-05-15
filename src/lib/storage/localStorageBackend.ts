import type { StorageBackend, VectorDbEntry } from './storageBackend';

const VECTOR_KEY = 'neurochat_v2_vectors';
const SESSION_KEY = 'neurochat_v2_memory';
const SUMMARY_KEY = 'neurochat_v2_weekly_summaries';
const TRACE_KEY = 'neurochat_agent_traces';

export class LocalStorageBackend implements StorageBackend {
  async getItem(key: string) { return localStorage.getItem(key); }
  async setItem(key: string, value: string) { localStorage.setItem(key, value); }
  async removeItem(key: string) { localStorage.removeItem(key); }

  async loadVectors(userName?: string): Promise<VectorDbEntry[]> {
    const raw = localStorage.getItem(VECTOR_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return userName ? data.filter((d: any) => d.userName === userName || d.metadata?.userName === userName) : data;
  }
  async addVector(entry: VectorDbEntry): Promise<void> {
    const current = await this.loadVectors();
    current.push(entry);
    localStorage.setItem(VECTOR_KEY, JSON.stringify(current));
  }
  async clearVectors(userName?: string): Promise<void> {
    if (!userName) return localStorage.removeItem(VECTOR_KEY);
    const current = await this.loadVectors();
    localStorage.setItem(VECTOR_KEY, JSON.stringify(current.filter((d: any) => (d.userName || d.metadata?.userName) !== userName)));
  }

  async loadSessions(): Promise<any[]> { return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]'); }
  async saveSessions(sessions: any[]): Promise<void> { localStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); }
  async clearSessions(): Promise<void> { localStorage.removeItem(SESSION_KEY); }

  async getProfile(userName: string): Promise<any | null> {
    const profiles = JSON.parse(localStorage.getItem('neurochat_v2_user_profile') || '{}');
    return profiles[userName] ?? null;
  }
  async setProfile(profile: any): Promise<void> {
    const profiles = JSON.parse(localStorage.getItem('neurochat_v2_user_profile') || '{}');
    profiles[profile.name] = profile;
    localStorage.setItem('neurochat_v2_user_profile', JSON.stringify(profiles));
  }

  async loadLearning(userId: string): Promise<string | null> { return localStorage.getItem(`neurochat_learning_${userId}`); }
  async saveLearning(userId: string, encryptedData: string): Promise<void> { localStorage.setItem(`neurochat_learning_${userId}`, encryptedData); }
  async clearLearning(userId: string): Promise<void> { localStorage.removeItem(`neurochat_learning_${userId}`); }

  async loadSummaries(): Promise<any[]> { return JSON.parse(localStorage.getItem(SUMMARY_KEY) || '[]'); }
  async saveSummary(summary: any): Promise<void> {
    const summaries = await this.loadSummaries();
    const next = summaries.filter((s: any) => s.weekId !== summary.weekId);
    next.push(summary);
    localStorage.setItem(SUMMARY_KEY, JSON.stringify(next));
  }
  async clearSummaries(): Promise<void> { localStorage.removeItem(SUMMARY_KEY); }

  async saveTrace(trace: any): Promise<void> {
    const current = JSON.parse(localStorage.getItem(TRACE_KEY) || '[]');
    current.push(trace);
    localStorage.setItem(TRACE_KEY, JSON.stringify(current.slice(-200)));
  }
  async loadTraces(): Promise<any[]> { return JSON.parse(localStorage.getItem(TRACE_KEY) || '[]'); }
}

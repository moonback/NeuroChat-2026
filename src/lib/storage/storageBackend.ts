export interface VectorDbEntry {
  id: string;
  text: string;
  vector: number[];
  sessionId: string;
  userName: string;
  speaker: 'user' | 'assistant';
  timestamp: number;
}

export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;

  loadVectors(userName?: string): Promise<VectorDbEntry[]>;
  addVector(entry: VectorDbEntry): Promise<void>;
  clearVectors(userName?: string): Promise<void>;

  loadSessions(): Promise<any[]>;
  saveSessions(sessions: any[]): Promise<void>;
  clearSessions(): Promise<void>;

  getProfile(userName: string): Promise<any | null>;
  setProfile(profile: any): Promise<void>;

  loadLearning(userId: string): Promise<string | null>;
  saveLearning(userId: string, encryptedData: string, lastUpdated: number): Promise<void>;
  clearLearning(userId: string): Promise<void>;

  loadSummaries(): Promise<any[]>;
  saveSummary(summary: any): Promise<void>;
  clearSummaries(): Promise<void>;

  saveTrace(trace: any): Promise<void>;
  loadTraces(): Promise<any[]>;

  migrate(payload: any): Promise<void>;
}

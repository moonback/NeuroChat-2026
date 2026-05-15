export interface KvBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface VectorDbEntry {
  id: string;
  text: string;
  vector: number[];
  sessionId: string;
  userName: string;
  speaker: 'user' | 'assistant';
  timestamp: number;
}

export interface StorageBackend extends KvBackend {
  loadVectors(userName?: string): Promise<VectorDbEntry[]>;
  addVector(entry: VectorDbEntry): Promise<void>;
  clearVectors(userName?: string): Promise<void>;
}

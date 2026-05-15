import type { StorageBackend, VectorDbEntry } from './storageBackend';

const VECTOR_KEY = 'neurochat_v2_vectors';

export class LocalStorageBackend implements StorageBackend {
  async getItem(key: string) { return localStorage.getItem(key); }
  async setItem(key: string, value: string) { localStorage.setItem(key, value); }
  async removeItem(key: string) { localStorage.removeItem(key); }

  async loadVectors(userName?: string): Promise<VectorDbEntry[]> {
    const raw = localStorage.getItem(VECTOR_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return userName ? data.filter((d: VectorDbEntry) => d.userName === userName) : data;
  }

  async addVector(entry: VectorDbEntry): Promise<void> {
    const current = await this.loadVectors();
    current.push(entry);
    localStorage.setItem(VECTOR_KEY, JSON.stringify(current));
  }

  async clearVectors(userName?: string): Promise<void> {
    if (!userName) return localStorage.removeItem(VECTOR_KEY);
    const current = await this.loadVectors();
    localStorage.setItem(VECTOR_KEY, JSON.stringify(current.filter((d) => d.userName !== userName)));
  }
}

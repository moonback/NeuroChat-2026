import type { StorageBackend, VectorDbEntry } from './storageBackend';

export class SqliteBackend implements StorageBackend {
  async getItem(key: string): Promise<string | null> {
    return window.neurochatElectron.db.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await window.neurochatElectron.db.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await window.neurochatElectron.db.delete(key);
  }

  async loadVectors(userName?: string): Promise<VectorDbEntry[]> {
    return window.neurochatElectron.db.loadVectors(userName);
  }

  async addVector(entry: VectorDbEntry): Promise<void> {
    await window.neurochatElectron.db.addVector(entry);
  }

  async clearVectors(userName?: string): Promise<void> {
    await window.neurochatElectron.db.clearVectors(userName);
  }
}

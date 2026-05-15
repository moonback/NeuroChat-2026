import type { StorageBackend } from './storageBackend';
import { LocalStorageBackend } from './localStorageBackend';
import { SqliteBackend } from './sqliteBackend';

let backend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (backend) return backend;
  backend = window.neurochatElectron?.db ? new SqliteBackend() : new LocalStorageBackend();
  return backend;
}

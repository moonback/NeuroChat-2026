/**
 * Storage layer for learning data with encryption utilities.
 * Implements localStorage wrapper with client-side encryption for privacy.
 * 
 * Requirements: 11.1, 11.2, 11.4, 11.5, 11.6
 */

import type {
  LearningData,
  FeedbackData,
  PromptVersionHistory,
  LearningCycleStatus,
  LearningCycleConfig,
  EncryptedLearningData,
} from './types';
import { DEFAULT_LEARNING_CONFIG } from './types';

// Storage keys
const STORAGE_KEY_PREFIX = 'neurochat_learning_';

/**
 * Encryption utility using Web Crypto API AES-GCM.
 * The CryptoKey is cached in memory to keep frequent prompt-version updates fast.
 */
class EncryptionUtil {
  private static cachedKey: CryptoKey | null = null;

  private static async getOrCreateKey(): Promise<CryptoKey> {
    if (this.cachedKey) return this.cachedKey;

    const storedKey = localStorage.getItem('neurochat_encryption_key');
    if (storedKey) {
      const keyData = JSON.parse(storedKey);
      this.cachedKey = await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      return this.cachedKey;
    }

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem('neurochat_encryption_key', JSON.stringify(exportedKey));
    this.cachedKey = key;
    return key;
  }

  /**
   * Encrypt data using AES-GCM.
   */
  static async encrypt(data: string): Promise<EncryptedLearningData> {
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      data: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt data using AES-GCM.
   */
  static async decrypt(encrypted: EncryptedLearningData): Promise<string> {
    const key = await this.getOrCreateKey();
    const iv = this.base64ToArrayBuffer(encrypted.iv);
    const encryptedData = this.base64ToArrayBuffer(encrypted.data);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Storage manager for learning data.
 * Handles localStorage operations with encryption.
 */
export class LearningDataStorage {
  private static cache = new Map<string, { raw: string | null; data: LearningData }>();

  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get the storage key for this user.
   */
  private getStorageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.userId}`;
  }

  /**
   * Initialize empty learning data structure.
   */
  private initializeEmptyData(): LearningData {
    return {
      feedback: {
        signals: [],
        userId: this.userId,
        lastUpdated: Date.now(),
      },
      versionHistory: {
        versions: [],
        activeVersion: 0,
        userId: this.userId,
        lastUpdated: Date.now(),
      },
      cycleHistory: [],
      config: { ...DEFAULT_LEARNING_CONFIG },
      lastUpdated: Date.now(),
    };
  }

  /**
   * Load learning data from localStorage.
   * Returns empty data structure if none exists.
   */
  async load(): Promise<LearningData> {
    try {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        const empty = this.initializeEmptyData();
        LearningDataStorage.cache.delete(key);
        return empty;
      }

      const cached = LearningDataStorage.cache.get(key);
      if (cached?.raw === stored) {
        return cached.data;
      }
      
      const encrypted: EncryptedLearningData = JSON.parse(stored);
      const decrypted = await EncryptionUtil.decrypt(encrypted);
      const data: LearningData = JSON.parse(decrypted);
      LearningDataStorage.cache.set(key, { raw: stored, data });
      
      return data;
    } catch (error) {
      console.error('Failed to load learning data:', error);
      return this.initializeEmptyData();
    }
  }

  /**
   * Save learning data to localStorage with encryption.
   */
  async save(data: LearningData): Promise<void> {
    try {
      const key = this.getStorageKey();
      data.lastUpdated = Date.now();
      
      const serialized = JSON.stringify(data);
      const encrypted = await EncryptionUtil.encrypt(serialized);
      
      const raw = JSON.stringify(encrypted);
      localStorage.setItem(key, raw);
      LearningDataStorage.cache.set(key, { raw, data });
    } catch (error) {
      console.error('Failed to save learning data:', error);
      throw error;
    }
  }

  /**
   * Update feedback data.
   */
  async updateFeedback(feedback: FeedbackData): Promise<void> {
    const data = await this.load();
    data.feedback = feedback;
    data.feedback.lastUpdated = Date.now();
    await this.save(data);
  }

  /**
   * Update version history.
   */
  async updateVersionHistory(versionHistory: PromptVersionHistory): Promise<void> {
    const data = await this.load();
    data.versionHistory = versionHistory;
    data.versionHistory.lastUpdated = Date.now();
    await this.save(data);
  }

  /**
   * Add a learning cycle status to history.
   */
  async addCycleStatus(status: LearningCycleStatus): Promise<void> {
    const data = await this.load();
    data.cycleHistory.push(status);
    // Keep only last 50 cycle statuses
    if (data.cycleHistory.length > 50) {
      data.cycleHistory = data.cycleHistory.slice(-50);
    }
    await this.save(data);
  }

  /**
   * Update learning cycle configuration.
   */
  async updateConfig(config: Partial<LearningCycleConfig>): Promise<void> {
    const data = await this.load();
    data.config = { ...data.config, ...config };
    await this.save(data);
  }

  /**
   * Export learning data as JSON for backup.
   */
  async export(): Promise<string> {
    const data = await this.load();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import learning data from JSON backup.
   */
  async import(jsonData: string): Promise<void> {
    try {
      const data: LearningData = JSON.parse(jsonData);
      
      // Validate the structure
      if (!data.feedback || !data.versionHistory || !data.config) {
        throw new Error('Invalid learning data structure');
      }
      
      // Update userId to current user
      data.feedback.userId = this.userId;
      data.versionHistory.userId = this.userId;
      
      await this.save(data);
    } catch (error) {
      console.error('Failed to import learning data:', error);
      throw error;
    }
  }

  /**
   * Clear all learning data for this user.
   */
  async clear(): Promise<void> {
    const key = this.getStorageKey();
    localStorage.removeItem(key);
    LearningDataStorage.cache.delete(key);
  }

  /**
   * Check if learning data exists for this user.
   */
  exists(): boolean {
    const key = this.getStorageKey();
    return localStorage.getItem(key) !== null;
  }
}

/**
 * Get a storage instance for a user.
 */
export function getLearningStorage(userId: string): LearningDataStorage {
  return new LearningDataStorage(userId);
}

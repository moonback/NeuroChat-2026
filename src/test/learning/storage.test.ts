/**
 * Unit tests for the learning data storage layer.
 * Tests localStorage operations, encryption/decryption, and data management.
 * 
 * Requirements: 11.1, 11.2, 11.4, 11.5, 11.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningDataStorage, getLearningStorage } from '../../lib/learning/storage';
import type { LearningData, FeedbackSignal, PromptVersion } from '../../lib/learning/types';

describe('LearningDataStorage', () => {
  let storage: LearningDataStorage;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new LearningDataStorage(testUserId);
  });

  describe('Initialization', () => {
    it('should create a storage instance with user ID', () => {
      expect(storage).toBeDefined();
      expect(storage).toBeInstanceOf(LearningDataStorage);
    });

    it('should return empty data structure when no data exists', async () => {
      const data = await storage.load();
      
      expect(data).toBeDefined();
      expect(data.feedback.signals).toEqual([]);
      expect(data.feedback.userId).toBe(testUserId);
      expect(data.versionHistory.versions).toEqual([]);
      expect(data.cycleHistory).toEqual([]);
      expect(data.config).toBeDefined();
      expect(data.config.enabled).toBe(true);
    });

    it('should check if data exists', async () => {
      expect(await storage.exists()).toBe(false);
    });
  });

  describe('Save and Load', () => {
    it('should save and load learning data', async () => {
      const data = await storage.load();
      
      // Add some test data
      const testSignal: FeedbackSignal = {
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'implicit',
        sentiment: 'positive',
        category: 'task_completion',
        turnIndex: 1,
      };
      
      data.feedback.signals.push(testSignal);
      
      await storage.save(data);
      
      // Load and verify
      const loadedData = await storage.load();
      expect(loadedData.feedback.signals).toHaveLength(1);
      expect(loadedData.feedback.signals[0].id).toBe('signal-1');
      expect(loadedData.feedback.signals[0].category).toBe('task_completion');
    });

    it('should encrypt data when saving', async () => {
      const data = await storage.load();
      data.feedback.signals.push({
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'explicit',
        sentiment: 'positive',
        category: 'explicit_positive',
        content: 'Great response!',
        turnIndex: 1,
      });
      
      await storage.save(data);
      
      // Check that stored data is encrypted (not plain JSON)
      const storageKey = `neurochat_learning_${testUserId}`;
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.data).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
      
      // Verify we can't read the original data directly
      expect(stored).not.toContain('Great response!');
    });

    it('should update lastUpdated timestamp when saving', async () => {
      const data = await storage.load();
      const originalTimestamp = data.lastUpdated;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await storage.save(data);
      
      const loadedData = await storage.load();
      expect(loadedData.lastUpdated).toBeGreaterThan(originalTimestamp);
    });
  });

  describe('Update Operations', () => {
    it('should update feedback data', async () => {
      const data = await storage.load();
      
      data.feedback.signals.push({
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'implicit',
        sentiment: 'negative',
        category: 'user_interruption',
        turnIndex: 1,
      });
      
      await storage.updateFeedback(data.feedback);
      
      const loadedData = await storage.load();
      expect(loadedData.feedback.signals).toHaveLength(1);
      expect(loadedData.feedback.signals[0].category).toBe('user_interruption');
    });

    it('should update version history', async () => {
      const data = await storage.load();
      
      const testVersion: PromptVersion = {
        version: 1,
        promptText: 'Test prompt',
        timestamp: Date.now(),
        changeDescription: 'Initial version',
        appliedProposals: [],
        isActive: true,
      };
      
      data.versionHistory.versions.push(testVersion);
      data.versionHistory.activeVersion = 1;
      
      await storage.updateVersionHistory(data.versionHistory);
      
      const loadedData = await storage.load();
      expect(loadedData.versionHistory.versions).toHaveLength(1);
      expect(loadedData.versionHistory.activeVersion).toBe(1);
      expect(loadedData.versionHistory.versions[0].changeDescription).toBe('Initial version');
    });

    it('should add cycle status to history', async () => {
      await storage.addCycleStatus({
        cycleId: 'cycle-1',
        startTime: Date.now(),
        phase: 'completed',
        proposalsGenerated: 2,
        proposalsValidated: 2,
        proposalsApplied: 1,
        errors: [],
        success: true,
      });
      
      const data = await storage.load();
      expect(data.cycleHistory).toHaveLength(1);
      expect(data.cycleHistory[0].cycleId).toBe('cycle-1');
      expect(data.cycleHistory[0].success).toBe(true);
    });

    it('should limit cycle history to 50 entries', async () => {
      // Add 60 cycle statuses
      for (let i = 0; i < 60; i++) {
        await storage.addCycleStatus({
          cycleId: `cycle-${i}`,
          startTime: Date.now(),
          phase: 'completed',
          proposalsGenerated: 1,
          proposalsValidated: 1,
          proposalsApplied: 1,
          errors: [],
          success: true,
        });
      }
      
      const data = await storage.load();
      expect(data.cycleHistory).toHaveLength(50);
      // Should keep the most recent ones
      expect(data.cycleHistory[0].cycleId).toBe('cycle-10');
      expect(data.cycleHistory[49].cycleId).toBe('cycle-59');
    });

    it('should update configuration', async () => {
      await storage.updateConfig({
        enabled: false,
        triggerAfterTurns: 100,
      });
      
      const data = await storage.load();
      expect(data.config.enabled).toBe(false);
      expect(data.config.triggerAfterTurns).toBe(100);
      // Other config values should remain unchanged
      expect(data.config.maxCyclesPerDay).toBe(1);
    });
  });

  describe('Export and Import', () => {
    it('should export learning data as JSON', async () => {
      const data = await storage.load();
      data.feedback.signals.push({
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'explicit',
        sentiment: 'positive',
        category: 'explicit_positive',
        turnIndex: 1,
      });
      
      await storage.save(data);
      
      const exported = await storage.export();
      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported);
      expect(parsed.feedback.signals).toHaveLength(1);
      expect(parsed.feedback.signals[0].id).toBe('signal-1');
    });

    it('should import learning data from JSON', async () => {
      const testData: LearningData = {
        feedback: {
          signals: [{
            id: 'imported-signal',
            timestamp: Date.now(),
            sessionId: 'session-1',
            type: 'implicit',
            sentiment: 'positive',
            category: 'follow_up_engagement',
            turnIndex: 1,
          }],
          userId: 'old-user',
          lastUpdated: Date.now(),
        },
        versionHistory: {
          versions: [],
          activeVersion: 0,
          userId: 'old-user',
          lastUpdated: Date.now(),
        },
        cycleHistory: [],
        config: {
          enabled: true,
          triggerAfterTurns: 50,
          maxCyclesPerDay: 1,
          maxExecutionTime: 5000,
          maxProposalsPerCycle: 3,
          regressionThreshold: 15,
          monitoringPeriod: 25,
        },
        lastUpdated: Date.now(),
      };
      
      const jsonData = JSON.stringify(testData);
      await storage.import(jsonData);
      
      const loadedData = await storage.load();
      expect(loadedData.feedback.signals).toHaveLength(1);
      expect(loadedData.feedback.signals[0].id).toBe('imported-signal');
      // User ID should be updated to current user
      expect(loadedData.feedback.userId).toBe(testUserId);
      expect(loadedData.versionHistory.userId).toBe(testUserId);
    });

    it('should reject invalid JSON during import', async () => {
      await expect(storage.import('invalid json')).rejects.toThrow();
    });

    it('should reject incomplete data structure during import', async () => {
      const invalidData = {
        feedback: { signals: [] },
        // Missing versionHistory and config
      };
      
      await expect(storage.import(JSON.stringify(invalidData))).rejects.toThrow();
    });
  });

  describe('Clear Operations', () => {
    it('should clear all learning data', async () => {
      const data = await storage.load();
      data.feedback.signals.push({
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'implicit',
        sentiment: 'positive',
        category: 'task_completion',
        turnIndex: 1,
      });
      
      await storage.save(data);
      expect(await storage.exists()).toBe(true);
      
      await storage.clear();
      expect(await storage.exists()).toBe(false);
      
      // Loading after clear should return empty data
      const loadedData = await storage.load();
      expect(loadedData.feedback.signals).toHaveLength(0);
    });
  });

  describe('Factory Function', () => {
    it('should create storage instance via factory', () => {
      const factoryStorage = getLearningStorage('factory-user');
      expect(factoryStorage).toBeInstanceOf(LearningDataStorage);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted data gracefully', async () => {
      // Manually insert corrupted data
      const storageKey = `neurochat_learning_${testUserId}`;
      localStorage.setItem(storageKey, 'corrupted data');
      
      // Should return empty data instead of throwing
      const data = await storage.load();
      expect(data.feedback.signals).toEqual([]);
    });

    it('should handle missing encryption key gracefully', async () => {
      // Remove encryption key
      localStorage.removeItem('neurochat_encryption_key');
      
      const data = await storage.load();
      data.feedback.signals.push({
        id: 'signal-1',
        timestamp: Date.now(),
        sessionId: 'session-1',
        type: 'implicit',
        sentiment: 'positive',
        category: 'task_completion',
        turnIndex: 1,
      });
      
      // Should create new key and save successfully
      await expect(storage.save(data)).resolves.not.toThrow();
      
      // Should be able to load the data
      const loadedData = await storage.load();
      expect(loadedData.feedback.signals).toHaveLength(1);
    });
  });
});

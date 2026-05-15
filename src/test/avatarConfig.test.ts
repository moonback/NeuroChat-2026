import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedAvatar,
  saveAvatar,
  loadChildName,
  saveChildName,
  AVATARS,
  AVATAR_IDS
} from '../lib/avatarConfig';

describe('avatarConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadSavedAvatar', () => {
    it('should return default avatar when nothing is saved', async () => {
      const avatar = await loadSavedAvatar();
      expect(avatar).toBe('robot');
    });

    it('should return saved avatar when valid', async () => {
      localStorage.setItem('NeuroChat-avatar', 'robot');
      const avatar = await loadSavedAvatar();
      expect(avatar).toBe('robot');
    });

    it('should return default avatar when saved value is invalid', async () => {
      localStorage.setItem('NeuroChat-avatar', 'invalid');
      const avatar = await loadSavedAvatar();
      expect(avatar).toBe('robot');
    });
  });

  describe('saveAvatar', () => {
    it('should save avatar to localStorage', async () => {
      await saveAvatar('robot');
      expect(localStorage.setItem).toHaveBeenCalledWith('NeuroChat-avatar', 'robot');
    });
  });

  describe('loadChildName', () => {
    it('should return empty string when nothing is saved', async () => {
      const name = await loadChildName();
      expect(name).toBe('');
    });

    it('should return saved name', async () => {
      localStorage.setItem('NeuroChat-child-name', 'Marie');
      // No need to mock getItem, LocalStorageBackend.getItem calls actual localStorage.getItem
      const name = await loadChildName();
      expect(name).toBe('Marie');
    });
  });

  describe('saveChildName', () => {
    it('should save child name to localStorage', async () => {
      await saveChildName('Marie');
      expect(localStorage.setItem).toHaveBeenCalledWith('NeuroChat-child-name', 'Marie');
    });
  });

  describe('AVATARS', () => {
    it('should have robot avatar configured', () => {
      expect(AVATARS.robot).toBeDefined();
      expect(AVATARS.robot.name).toBe('NeuroChat');
      expect(AVATARS.robot.colors).toHaveLength(3);
    });
  });

  describe('AVATAR_IDS', () => {
    it('should contain robot', () => {
      expect(AVATAR_IDS).toContain('robot');
    });
  });
});

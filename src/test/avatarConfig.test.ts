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
    it('should return default avatar when nothing is saved', () => {
      const avatar = loadSavedAvatar();
      expect(avatar).toBe('robot');
    });

    it('should return saved avatar when valid', () => {
      localStorage.setItem('kidsvoice-avatar', 'robot');
      const avatar = loadSavedAvatar();
      expect(avatar).toBe('robot');
    });

    it('should return default avatar when saved value is invalid', () => {
      localStorage.setItem('kidsvoice-avatar', 'invalid');
      const avatar = loadSavedAvatar();
      expect(avatar).toBe('robot');
    });
  });

  describe('saveAvatar', () => {
    it('should save avatar to localStorage', () => {
      saveAvatar('robot');
      expect(localStorage.setItem).toHaveBeenCalledWith('kidsvoice-avatar', 'robot');
    });
  });

  describe('loadChildName', () => {
    it('should return empty string when nothing is saved', () => {
      const name = loadChildName();
      expect(name).toBe('');
    });

    it('should return saved name', () => {
      localStorage.setItem('kidsvoice-child-name', 'Marie');
      localStorage.getItem = vi.fn().mockReturnValue('Marie');
      const name = loadChildName();
      expect(name).toBe('Marie');
    });
  });

  describe('saveChildName', () => {
    it('should save child name to localStorage', () => {
      saveChildName('Marie');
      expect(localStorage.setItem).toHaveBeenCalledWith('kidsvoice-child-name', 'Marie');
    });
  });

  describe('AVATARS', () => {
    it('should have robot avatar configured', () => {
      expect(AVATARS.robot).toBeDefined();
      expect(AVATARS.robot.name).toBe('Robot Cool');
      expect(AVATARS.robot.colors).toHaveLength(3);
    });
  });

  describe('AVATAR_IDS', () => {
    it('should contain robot', () => {
      expect(AVATAR_IDS).toContain('robot');
    });
  });
});

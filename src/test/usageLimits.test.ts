import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUsageStatus, trackUsage, getRemainingMinutes } from '../lib/usageLimits';

describe('usageLimits', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // Reset date to a normal daytime hour
    vi.setSystemTime(new Date('2026-05-13T14:00:00'));
  });

  describe('getUsageStatus', () => {
    it('should not restrict during daytime with no usage', () => {
      const status = getUsageStatus();
      expect(status.isRestricted).toBe(false);
      expect(status.reason).toBe(null);
    });

    it('should restrict during night hours (after 20h)', () => {
      vi.setSystemTime(new Date('2026-05-13T21:00:00'));
      const status = getUsageStatus();
      expect(status.isRestricted).toBe(true);
      expect(status.reason).toBe('night');
      expect(status.message).toContain('reposer');
    });

    it('should restrict during night hours (before 7h)', () => {
      vi.setSystemTime(new Date('2026-05-13T06:00:00'));
      const status = getUsageStatus();
      expect(status.isRestricted).toBe(true);
      expect(status.reason).toBe('night');
    });

    it('should NOT restrict when daily limit of 30 is reached (removed)', () => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('NeuroChat-usage', JSON.stringify({ date: today, minutes: 30 }));
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ date: today, minutes: 30 }));

      const status = getUsageStatus();
      expect(status.isRestricted).toBe(false);
    });

    it('should reset usage for a new day', () => {
      const yesterday = new Date('2026-05-12').toISOString().split('T')[0];
      localStorage.setItem('NeuroChat-usage', JSON.stringify({ date: yesterday, minutes: 30 }));
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ date: yesterday, minutes: 30 }));

      const status = getUsageStatus();
      expect(status.isRestricted).toBe(false);
    });
  });

  describe('trackUsage', () => {
    it('should track usage in minutes', () => {
      trackUsage(60); // 60 seconds = 1 minute
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should accumulate usage', () => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('NeuroChat-usage', JSON.stringify({ date: today, minutes: 5 }));
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ date: today, minutes: 5 }));

      trackUsage(300); // 5 more minutes

      const calls = (localStorage.setItem as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.minutes).toBe(10);
    });
  });

  describe('getRemainingMinutes', () => {
    it('should return full limit (1440) for new day', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null);
      const remaining = getRemainingMinutes();
      expect(remaining).toBe(1440);
    });

    it('should return remaining minutes after usage', () => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('NeuroChat-usage', JSON.stringify({ date: today, minutes: 10 }));
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ date: today, minutes: 10 }));

      const remaining = getRemainingMinutes();
      expect(remaining).toBe(1430);
    });

    it('should not return negative minutes', () => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('NeuroChat-usage', JSON.stringify({ date: today, minutes: 35 }));
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({ date: today, minutes: 35 }));

      const remaining = getRemainingMinutes();
      expect(remaining).toBe(0);
    });
  });
});

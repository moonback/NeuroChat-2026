/**
 * Logic for managing usage time and night mode restrictions.
 */

export interface UsageStatus {
  isRestricted: boolean;
  reason: "night" | "limit" | null;
  message: string;
}

// Configuration
const DAILY_LIMIT_MINUTES = 1440; // Practically no limit (24 hours)
const NIGHT_HOUR_START = 20;    // 8 PM
const NIGHT_HOUR_END = 7;       // 7 AM

/**
 * Checks if the user should be restricted based on time or usage.
 */
export function getUsageStatus(): UsageStatus {
  const now = new Date();
  const hour = now.getHours();

  // 1. Night mode check
  if (hour >= NIGHT_HOUR_START || hour < NIGHT_HOUR_END) {
    return {
      isRestricted: true,
      reason: "night",
      message: "Chut ! C'est l'heure de se reposer. Tes amis magiques dorment aussi. 😴"
    };
  }

  // Daily limit check removed as per user request

  return { isRestricted: false, reason: null, message: "" };
}

/**
 * Increments the stored usage time for today.
 */
export function trackUsage(seconds: number) {
  const today = new Date().toISOString().split('T')[0];
  const storedData = localStorage.getItem('NeuroChat-usage');
  let usage = storedData ? JSON.parse(storedData) : { date: today, minutes: 0 };

  if (usage.date !== today) {
    usage = { date: today, minutes: 0 };
  }

  // Convert seconds to minutes for storage
  usage.minutes += seconds / 60;
  localStorage.setItem('NeuroChat-usage', JSON.stringify(usage));
}

/**
 * Get remaining minutes for today
 */
export function getRemainingMinutes(): number {
  const today = new Date().toISOString().split('T')[0];
  const storedData = localStorage.getItem('NeuroChat-usage');
  let usage = storedData ? JSON.parse(storedData) : { date: today, minutes: 0 };

  if (usage.date !== today) return DAILY_LIMIT_MINUTES;
  return Math.max(0, Math.floor(DAILY_LIMIT_MINUTES - usage.minutes));
}

export type SecurityEventType =
  | 'modification_attempt'
  | 'validation_rejection'
  | 'regression_detected'
  | 'rollback_performed';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: number;
  message: string;
  details?: Record<string, unknown>;
}

const SECURITY_EVENTS_KEY = 'neurochat_security_events';
const MAX_SECURITY_EVENTS = 100;

export class SecurityLogger {
  constructor(private readonly now: () => number = () => Date.now()) {}

  log(type: SecurityEventType, message: string, details: Record<string, unknown> = {}): SecurityEvent {
    const event: SecurityEvent = {
      id: `security_${this.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      timestamp: this.now(),
      message,
      details,
    };

    const events = this.getEvents(MAX_SECURITY_EVENTS);
    events.push(event);
    const limited = events.slice(-MAX_SECURITY_EVENTS);
    localStorage.setItem(SECURITY_EVENTS_KEY, JSON.stringify(limited));
    return event;
  }

  logValidationRejection(reason: string, details: Record<string, unknown> = {}): SecurityEvent {
    return this.log('validation_rejection', reason, details);
  }

  logModificationAttempt(targetSection: string, reason: string, details: Record<string, unknown> = {}): SecurityEvent {
    return this.log('modification_attempt', reason, { targetSection, ...details });
  }

  logRegressionRollback(version: number, percentDecrease: number, details: Record<string, unknown> = {}): SecurityEvent {
    return this.log('rollback_performed', `Rolled back prompt version ${version} after ${percentDecrease.toFixed(2)}% regression.`, {
      version,
      percentDecrease,
      ...details,
    });
  }

  getEvents(limit: number = 50): SecurityEvent[] {
    try {
      const stored = localStorage.getItem(SECURITY_EVENTS_KEY);
      const events: SecurityEvent[] = stored ? JSON.parse(stored) : [];
      return events.slice(-limit);
    } catch {
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(SECURITY_EVENTS_KEY);
  }
}

export const defaultSecurityLogger = new SecurityLogger();

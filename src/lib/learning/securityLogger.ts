import { getStorageBackend } from '../storage';

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
  targetSection?: string;
  reason?: string;
  proposalId?: string;
  details?: Record<string, unknown>;
}

const SECURITY_EVENTS_KEY = 'neurochat_security_events';
const MAX_SECURITY_EVENTS = 100;

export class SecurityLogger {
  constructor(private readonly now: () => number = () => Date.now()) {}

  async log(type: SecurityEventType, message: string, details: Record<string, unknown> = {}): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: `security_${this.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      timestamp: this.now(),
      message,
      targetSection: typeof details.targetSection === 'string' ? details.targetSection : undefined,
      reason: typeof details.reason === 'string' ? details.reason : message,
      proposalId: typeof details.proposalId === 'string' ? details.proposalId : undefined,
      details,
    };

    const events = await this.getEvents(MAX_SECURITY_EVENTS);
    events.push(event);
    await getStorageBackend().setItem(SECURITY_EVENTS_KEY, JSON.stringify(events.slice(-MAX_SECURITY_EVENTS)));
    return event;
  }

  async logValidationRejection(reason: string, details: Record<string, unknown> = {}): Promise<SecurityEvent> {
    return this.log('validation_rejection', reason, { reason, ...details });
  }

  async logModificationAttempt(targetSection: string, reason: string, details: Record<string, unknown> = {}): Promise<SecurityEvent> {
    return this.log('modification_attempt', reason, { targetSection, reason, ...details });
  }

  async logRegressionRollback(version: number, percentDecrease: number, details: Record<string, unknown> = {}): Promise<SecurityEvent> {
    return this.log('rollback_performed', `Rolled back prompt version ${version} after ${percentDecrease.toFixed(2)}% regression.`, {
      reason: 'Regression rollback triggered',
      version,
      percentDecrease,
      ...details,
    });
  }

  async getEvents(limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const stored = await getStorageBackend().getItem(SECURITY_EVENTS_KEY);
      const events: SecurityEvent[] = stored ? JSON.parse(stored) : [];
      return events.slice(-limit);
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    await getStorageBackend().removeItem(SECURITY_EVENTS_KEY);
  }
}

export const defaultSecurityLogger = new SecurityLogger();

import { beforeEach, describe, expect, it } from 'vitest';
import { SecurityLogger } from '../../lib/learning/securityLogger';

describe('SecurityLogger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logs validation rejections with searchable top-level fields', () => {
    const logger = new SecurityLogger(() => 123);

    const event = logger.logValidationRejection('Blocked immutable prompt change', {
      targetSection: 'SAFETY & PRIVACY',
      proposalId: 'proposal-1',
    });

    expect(event.type).toBe('validation_rejection');
    expect(event.reason).toBe('Blocked immutable prompt change');
    expect(event.targetSection).toBe('SAFETY & PRIVACY');
    expect(event.proposalId).toBe('proposal-1');

    const stored = logger.getEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0].timestamp).toBe(123);
  });

  it('logs modification attempts', () => {
    const logger = new SecurityLogger(() => 456);

    logger.logModificationAttempt('IDENTITY & PERSONA', 'Attempted identity rewrite');

    const events = logger.getEvents();
    expect(events[0].type).toBe('modification_attempt');
    expect(events[0].targetSection).toBe('IDENTITY & PERSONA');
    expect(events[0].reason).toBe('Attempted identity rewrite');
  });

  it('logs regression rollbacks with version metadata', () => {
    const logger = new SecurityLogger(() => 789);

    logger.logRegressionRollback(3, 16.25, { restoredVersion: 2 });

    const event = logger.getEvents()[0];
    expect(event.type).toBe('rollback_performed');
    expect(event.details?.version).toBe(3);
    expect(event.details?.restoredVersion).toBe(2);
    expect(event.details?.percentDecrease).toBe(16.25);
  });

  it('keeps only the latest 100 events', () => {
    const logger = new SecurityLogger();

    for (let i = 0; i < 150; i++) {
      logger.logValidationRejection(`Event ${i}`);
    }

    const events = logger.getEvents(150);
    expect(events).toHaveLength(100);
    expect(events[0].reason).toBe('Event 50');
    expect(events[99].reason).toBe('Event 149');
  });
});

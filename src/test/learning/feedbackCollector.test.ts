import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackCollector } from '../../lib/learning/feedbackCollector';
import { getLearningStorage } from '../../lib/learning/storage';
import type { ConversationTurn } from '../../lib/conversationMemory';

describe('FeedbackCollector', () => {
  const userId = 'test-user';

  beforeEach(async () => {
    localStorage.clear();
    await getLearningStorage(userId).clear();
  });

  it('collects implicit negative and positive signals from representative conversation', async () => {
    const collector = new FeedbackCollector(userId);
    const previousTurns: ConversationTurn[] = [
      { timestamp: Date.now() - 3000, speaker: 'assistant', message: 'Voulez-vous que je continue ?' },
      { timestamp: Date.now() - 2000, speaker: 'user', message: 'Quels sont les étapes ?' },
      { timestamp: Date.now() - 1000, speaker: 'assistant', message: 'Voici les étapes...' },
    ];

    const signals = await collector.collectFromTurn('session-1', 3, {
      timestamp: Date.now(),
      speaker: 'user',
      message: 'Can you clarify? Thanks, done.'
    }, previousTurns);

    expect(signals.some(s => s.category === 'clarification_request')).toBe(true);
    expect(signals.some(s => s.category === 'positive_acknowledgment')).toBe(true);
    expect(signals.some(s => s.category === 'task_completion')).toBe(true);

    const stored = await getLearningStorage(userId).load();
    expect(stored.feedback.signals.length).toBe(signals.length);
  });

  it('detects repeated question pattern', async () => {
    const collector = new FeedbackCollector(userId);
    const previousTurns: ConversationTurn[] = [
      { timestamp: Date.now() - 5000, speaker: 'user', message: 'How do I reset password?' },
      { timestamp: Date.now() - 4000, speaker: 'assistant', message: 'Go to settings.' },
    ];

    const signals = await collector.collectFromTurn('session-2', 2, {
      timestamp: Date.now(),
      speaker: 'user',
      message: 'How do I reset password?'
    }, previousTurns);

    expect(signals.some(s => s.category === 'repeated_question')).toBe(true);
  });

  it('records explicit feedback with context', async () => {
    const collector = new FeedbackCollector(userId);
    const signal = await collector.recordExplicitFeedback('session-3', 7, false, 'Too verbose');

    expect(signal.type).toBe('explicit');
    expect(signal.category).toBe('explicit_negative');
    expect(signal.content).toBe('Too verbose');

    const stored = await getLearningStorage(userId).load();
    expect(stored.feedback.signals[0]?.category).toBe('explicit_negative');
  });
});

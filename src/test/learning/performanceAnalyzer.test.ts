import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PerformanceAnalyzer } from '../../lib/learning/performanceAnalyzer';
import type { ConversationTurn } from '../../lib/conversationMemory';
import type { FeedbackSignal } from '../../lib/learning/types';

const analyzer = new PerformanceAnalyzer();

describe('PerformanceAnalyzer', () => {
  it('computes concision ratio for target range', () => {
    const turns: ConversationTurn[] = [
      { timestamp: 1, speaker: 'assistant', message: 'mot '.repeat(40).trim() },
    ];
    const metrics = analyzer.computeMetrics(turns, [], 2);
    expect(metrics.concisionRatio).toBeCloseTo(1, 1);
    expect(metrics.compositeQualityScore).toBeGreaterThanOrEqual(0);
  });

  it('computes context awareness percentage', () => {
    const turns: ConversationTurn[] = [
      { timestamp: 1, speaker: 'assistant', message: 'Comme tu as dit plus tôt, voici le plan.' },
      { timestamp: 2, speaker: 'assistant', message: 'Voici la réponse directe.' },
    ];
    const metrics = analyzer.computeMetrics(turns, [], 3);
    expect(metrics.contextAwareness).toBe(50);
  });

  it('computes composite score with feedback influence', () => {
    const turns: ConversationTurn[] = [
      { timestamp: 1, speaker: 'assistant', message: 'Je peux aussi proposer une prochaine étape ?' },
    ];
    const feedback: FeedbackSignal[] = [
      { id: '1', timestamp: 1, sessionId: 's', type: 'implicit', sentiment: 'positive', category: 'positive_acknowledgment', turnIndex: 0 },
      { id: '2', timestamp: 2, sessionId: 's', type: 'implicit', sentiment: 'negative', category: 'clarification_request', turnIndex: 1 },
    ];
    const metrics = analyzer.computeMetrics(turns, feedback, 4);
    expect(metrics.userSatisfaction).toBe(50);
    expect(metrics.compositeQualityScore).toBeGreaterThanOrEqual(0);
    expect(metrics.compositeQualityScore).toBeLessThanOrEqual(100);
  });

  it('property: composite quality score stays within 0..100', () => {
    fc.assert(fc.property(fc.array(fc.string(), { minLength: 1, maxLength: 30 }), (messages) => {
      const turns: ConversationTurn[] = messages.map((m, i) => ({
        timestamp: i + 1,
        speaker: 'assistant',
        message: m || 'x',
      }));
      const metrics = analyzer.computeMetrics(turns, []);
      expect(metrics.compositeQualityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.compositeQualityScore).toBeLessThanOrEqual(100);
    }));
  });

  it('property: percentage metrics stay within 0..100', () => {
    fc.assert(fc.property(fc.array(fc.string(), { minLength: 0, maxLength: 30 }), (messages) => {
      const turns: ConversationTurn[] = messages.map((m, i) => ({
        timestamp: i + 1,
        speaker: 'assistant',
        message: m,
      }));
      const metrics = analyzer.computeMetrics(turns, []);
      expect(metrics.contextAwareness).toBeGreaterThanOrEqual(0);
      expect(metrics.contextAwareness).toBeLessThanOrEqual(100);
      expect(metrics.proactivity).toBeGreaterThanOrEqual(0);
      expect(metrics.proactivity).toBeLessThanOrEqual(100);
    }));
  });
});

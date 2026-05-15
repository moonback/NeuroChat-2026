import { beforeEach, describe, expect, it } from 'vitest';
import { PromptOptimizer } from '../../lib/learning/promptOptimizer';
import { addVectorEntry } from '../../lib/vectorStore';
import type { PerformanceReport } from '../../lib/learning/types';

function report(overrides: Partial<PerformanceReport> = {}): PerformanceReport {
  return {
    metrics: {
      concisionRatio: 1.4,
      contextAwareness: 40,
      proactivity: 20,
      userSatisfaction: 45,
      compositeQualityScore: 48,
      turnCount: 12,
      periodStart: 1,
      periodEnd: 2,
      individualMetrics: [],
    },
    patterns: [
      {
        type: 'failure',
        description: 'user_interruption observed',
        frequency: 4,
        severity: 8,
        examples: [1, 2],
        improvementArea: 'Reduce verbosity and lead with the answer',
      },
      {
        type: 'failure',
        description: 'clarification_request observed',
        frequency: 3,
        severity: 7,
        examples: [3],
        improvementArea: 'Improve clarity and structure',
      },
    ],
    improvementAreas: ['Reduce verbosity and lead with the answer', 'Improve clarity and structure'],
    timestamp: 2,
    ...overrides,
  };
}

describe('PromptOptimizer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates targeted proposals from performance weaknesses', async () => {
    const optimizer = new PromptOptimizer({ now: () => 1000 });
    const proposals = await optimizer.generateProposals(report());

    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.length).toBeLessThanOrEqual(3);
    expect(proposals[0].targetSection).toBe('CORE OPERATIONAL RULES');
    expect(proposals[0].justification).toContain('Ratio de concision');
    expect(proposals[0].motivatingData.patterns).toContain('user_interruption observed');
  });

  it('preserves personality consistency in generated changes', async () => {
    const optimizer = new PromptOptimizer({ now: () => 1000 });
    const proposals = await optimizer.generateProposals(report());

    for (const proposal of proposals) {
      expect(proposal.proposedChange).toContain('proactif');
      expect(proposal.proposedChange).toContain('intelligent');
      expect(proposal.proposedChange).toContain('concis');
      expect(proposal.proposedChange).toContain('naturel');
      expect(proposal.proposedChange).toContain('respectueux');
    }
  });

  it('limits proposals to the configured maximum', async () => {
    const optimizer = new PromptOptimizer({ now: () => 1000, maxProposals: 2 });
    const proposals = await optimizer.generateProposals(report());

    expect(proposals).toHaveLength(2);
  });

  it('uses recent assistant vector entries as successful style hints', async () => {
    await addVectorEntry({
      id: 'assistant-1',
      text: 'Réponse claire et utile en une phrase.',
      vector: [1, 0, 0],
      metadata: {
        sessionId: 'session-1',
        userName: 'Marie',
        speaker: 'assistant',
        timestamp: 10,
      },
    });

    const optimizer = new PromptOptimizer({ now: () => 1000 });
    const proposals = await optimizer.generateProposals(report(), { userId: 'Marie' });

    expect(proposals[0].proposedChange).toContain('Réponse claire et utile');
    expect(proposals[0].proposedChange).toContain('Inspire-toi de tes réussites');
  });

  it('triggers empathy template for low satisfaction', async () => {
    const optimizer = new PromptOptimizer({ now: () => 1000 });
    const lowSatisfactionReport = report({
      metrics: {
        ...report().metrics,
        userSatisfaction: 30,
      },
      patterns: [
        {
          type: 'failure',
          description: 'explicit_negative observed',
          frequency: 5,
          severity: 9,
          examples: [1],
          improvementArea: 'Improve emotional intelligence and empathy',
        }
      ],
      improvementAreas: ['Improve emotional intelligence and empathy'],
    });

    const proposals = await optimizer.generateProposals(lowSatisfactionReport);
    const empathyProposal = proposals.find(p => p.proposedChange.includes('émotion'));
    expect(empathyProposal).toBeDefined();
    expect(empathyProposal?.justification).toContain('Satisfaction faible');
  });
});

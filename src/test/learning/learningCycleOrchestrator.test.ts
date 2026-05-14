import { beforeEach, describe, expect, it } from 'vitest';
import { LearningCycleOrchestrator } from '../../lib/learning/learningCycleOrchestrator';
import type { ImprovementProposal } from '../../lib/learning/types';

const baseProposal: ImprovementProposal = {
  id: 'p1',
  targetSection: 'CORE OPERATIONAL RULES',
  proposedChange: 'Rester proactif, intelligent, concis, naturel et respectueux.',
  justification: 'Improve quality',
  motivatingData: { patterns: ['clarification_request'], metrics: { contextAwareness: 42 } },
  createdAt: Date.now(),
  status: 'pending',
};

describe('LearningCycleOrchestrator', () => {
  beforeEach(() => localStorage.clear());

  it('runs a successful cycle and records status', async () => {
    const orchestrator = new LearningCycleOrchestrator();

    const result = await orchestrator.runCycle({
      userId: 'u1',
      turns: [
        { timestamp: 1, speaker: 'assistant', message: 'Je peux proposer une prochaine étape ?' },
        { timestamp: 2, speaker: 'user', message: 'Oui merci' },
      ],
      proposals: [baseProposal],
      currentPrompt: 'Base prompt '.repeat(120),
    });

    expect(result.success).toBe(true);
    expect(result.phase).toBe('completed');
    expect(result.proposalsApplied).toBe(1);
  });

  it('fails when validation rejects proposals', async () => {
    const orchestrator = new LearningCycleOrchestrator();

    const result = await orchestrator.runCycle({
      userId: 'u2',
      turns: [],
      proposals: [{ ...baseProposal, targetSection: 'SAFETY & PRIVACY' }],
      currentPrompt: 'Base prompt '.repeat(120),
    });

    expect(result.success).toBe(false);
    expect(result.phase).toBe('failed');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('enforces 24-hour cycle limit using stored config', async () => {
    let now = 1_000_000;
    const orchestrator = new LearningCycleOrchestrator({ now: () => now });

    const input = {
      userId: 'u3',
      turns: [],
      proposals: [baseProposal],
      currentPrompt: 'Base prompt '.repeat(120),
    };

    const first = await orchestrator.runCycle(input);
    expect(first.success).toBe(true);

    now += 1000; // still inside 24h
    const second = await orchestrator.runCycle(input);
    expect(second.success).toBe(false);
    expect(second.errors[0]).toContain('limit');
  });
});

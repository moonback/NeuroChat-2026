import { beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { RegressionDetector } from '../../lib/learning/regressionDetector';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import type { ImprovementProposal, PerformanceMetrics } from '../../lib/learning/types';

const USER_ID = 'regression-user';

function metrics(score: number): PerformanceMetrics {
  return {
    concisionRatio: 100,
    contextAwareness: 100,
    proactivity: 100,
    userSatisfaction: score,
    compositeQualityScore: score,
    turnCount: 25,
    periodStart: 1,
    periodEnd: 2,
    individualMetrics: [],
  };
}

function proposal(id: string): ImprovementProposal {
  return {
    id,
    targetSection: 'CORE OPERATIONAL RULES',
    proposedChange: 'Réponds plus directement tout en restant naturel.',
    justification: 'Repeated interruptions indicate verbosity.',
    motivatingData: { patterns: ['user_interruption'], metrics: { compositeQualityScore: 60 } },
    createdAt: Date.now(),
    status: 'applied',
  };
}

describe('RegressionDetector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects a regression when score decreases beyond threshold', () => {
    const detector = new RegressionDetector();
    const result = detector.compareMetrics(metrics(100), metrics(84.9), 15);

    expect(result.isRegression).toBe(true);
    expect(result.percentDecrease).toBeGreaterThan(15);
  });

  it('does not flag changes at or below the regression threshold', () => {
    const detector = new RegressionDetector();
    const result = detector.compareMetrics(metrics(100), metrics(85), 15);

    expect(result.isRegression).toBe(false);
    expect(result.percentDecrease).toBe(15);
  });

  it('rolls back to the previous prompt version and reports ineffective proposals', async () => {
    const manager = new PromptVersionManager(USER_ID);
    await manager.createVersion({ promptText: 'Prompt before improvement', changeDescription: 'baseline', appliedProposals: [] });
    await manager.createVersion({ promptText: 'Prompt after improvement', changeDescription: 'auto-improvement', appliedProposals: ['p1'] });

    const detector = new RegressionDetector();
    const appliedProposal = proposal('p1');
    const result = await detector.detectAndRollback({
      userId: USER_ID,
      previousVersion: 1,
      activeVersion: 2,
      previousMetrics: metrics(90),
      currentMetrics: metrics(70),
      threshold: 15,
      proposals: [appliedProposal],
    });

    expect(result.rolledBack).toBe(true);
    expect(result.restoredVersion?.promptText).toBe('Prompt before improvement');
    expect(result.ineffectiveProposalIds).toEqual(['p1']);
    expect(appliedProposal.status).toBe('ineffective');

    const history = await manager.getHistory();
    expect(history.activeVersion).toBe(1);
    expect(history.versions.find((version) => version.version === 1)?.isActive).toBe(true);
  });


  it('monitors an active version and rolls back after the monitoring period on regression', async () => {
    const manager = new PromptVersionManager(USER_ID);
    await manager.createVersion({
      promptText: 'Prompt baseline',
      changeDescription: 'baseline',
      appliedProposals: [],
      performanceMetrics: metrics(92),
    });
    await manager.createVersion({
      promptText: 'Prompt changed',
      changeDescription: 'auto-improvement',
      appliedProposals: ['p1', 'p2'],
    });

    const detector = new RegressionDetector();
    const result = await detector.monitorActiveVersion({
      userId: USER_ID,
      currentMetrics: metrics(70),
      monitoringPeriod: 25,
      threshold: 15,
    });

    expect(result.monitored).toBe(true);
    expect(result.rolledBack).toBe(true);
    expect(result.previousVersion).toBe(1);
    expect(result.activeVersion).toBe(2);
    expect(result.ineffectiveProposalIds).toEqual(['p1', 'p2']);

    const history = await manager.getHistory();
    expect(history.activeVersion).toBe(1);
  });

  it('waits until the monitoring period is complete before checking regression', async () => {
    const manager = new PromptVersionManager(USER_ID);
    await manager.createVersion({
      promptText: 'Prompt baseline',
      changeDescription: 'baseline',
      appliedProposals: [],
      performanceMetrics: metrics(92),
    });
    await manager.createVersion({
      promptText: 'Prompt changed',
      changeDescription: 'auto-improvement',
      appliedProposals: ['p1'],
    });

    const detector = new RegressionDetector();
    const result = await detector.monitorActiveVersion({
      userId: USER_ID,
      currentMetrics: { ...metrics(60), turnCount: 24 },
      monitoringPeriod: 25,
      threshold: 15,
    });

    expect(result.monitored).toBe(false);
    expect(result.rolledBack).toBe(false);
    expect(result.reason).toContain('Monitoring period not complete');

    const history = await manager.getHistory();
    expect(history.activeVersion).toBe(2);
  });

  it('property: decreases greater than 15% trigger rollback classification', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.double({ min: 15.01, max: 99.99, noNaN: true }),
        (previous, decrease) => {
          const current = Math.max(0, previous * (1 - decrease / 100));
          const result = new RegressionDetector().compareMetrics(metrics(previous), metrics(current), 15);
          expect(result.isRegression).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});

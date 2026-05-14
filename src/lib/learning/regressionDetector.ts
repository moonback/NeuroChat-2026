import type { ImprovementProposal, PerformanceMetrics, PromptVersion } from './types';
import { DEFAULT_LEARNING_CONFIG } from './types';
import { PromptVersionManager } from './promptVersionManager';
import { SecurityLogger, defaultSecurityLogger } from './securityLogger';

export interface RegressionComparison {
  previousScore: number;
  currentScore: number;
  percentDecrease: number;
  threshold: number;
  isRegression: boolean;
}

export interface RegressionRollbackInput {
  userId: string;
  previousVersion: number;
  activeVersion: number;
  previousMetrics: PerformanceMetrics;
  currentMetrics: PerformanceMetrics;
  threshold?: number;
  proposals?: ImprovementProposal[];
}

export interface RegressionRollbackResult extends RegressionComparison {
  rolledBack: boolean;
  restoredVersion: PromptVersion | null;
  ineffectiveProposalIds: string[];
}

export class RegressionDetector {
  constructor(
    private readonly versionManagerFactory: (userId: string) => PromptVersionManager = (userId) => new PromptVersionManager(userId),
    private readonly securityLogger: SecurityLogger = defaultSecurityLogger,
  ) {}

  compareMetrics(
    previousMetrics: PerformanceMetrics,
    currentMetrics: PerformanceMetrics,
    threshold: number = DEFAULT_LEARNING_CONFIG.regressionThreshold,
  ): RegressionComparison {
    const previousScore = this.clampScore(previousMetrics.compositeQualityScore);
    const currentScore = this.clampScore(currentMetrics.compositeQualityScore);
    const percentDecrease = previousScore === 0
      ? (currentScore < previousScore ? 100 : 0)
      : Math.max(0, ((previousScore - currentScore) / previousScore) * 100);

    return {
      previousScore,
      currentScore,
      percentDecrease,
      threshold,
      isRegression: percentDecrease > threshold,
    };
  }

  async detectAndRollback(input: RegressionRollbackInput): Promise<RegressionRollbackResult> {
    const comparison = this.compareMetrics(
      input.previousMetrics,
      input.currentMetrics,
      input.threshold,
    );

    if (!comparison.isRegression) {
      return {
        ...comparison,
        rolledBack: false,
        restoredVersion: null,
        ineffectiveProposalIds: [],
      };
    }

    this.securityLogger.log('regression_detected', `Prompt version ${input.activeVersion} regressed by ${comparison.percentDecrease.toFixed(2)}%.`, {
      activeVersion: input.activeVersion,
      previousVersion: input.previousVersion,
      previousScore: comparison.previousScore,
      currentScore: comparison.currentScore,
      threshold: comparison.threshold,
    });

    const restoredVersion = await this.versionManagerFactory(input.userId).rollback(input.previousVersion);
    const ineffectiveProposalIds = input.proposals
      ?.filter((proposal) => restoredVersion ? proposal.status === 'applied' : true)
      .map((proposal) => proposal.id) ?? [];

    if (restoredVersion && input.proposals) {
      input.proposals.forEach((proposal) => {
        if (ineffectiveProposalIds.includes(proposal.id)) {
          proposal.status = 'ineffective';
        }
      });
    }

    if (restoredVersion) {
      this.securityLogger.logRegressionRollback(input.activeVersion, comparison.percentDecrease, {
        restoredVersion: restoredVersion.version,
        ineffectiveProposalIds,
      });
    }

    return {
      ...comparison,
      rolledBack: Boolean(restoredVersion),
      restoredVersion,
      ineffectiveProposalIds,
    };
  }

  private clampScore(score: number): number {
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, score));
  }
}

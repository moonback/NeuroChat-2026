import type { ImprovementProposal, PerformanceMetrics, PromptVersion } from './types';
import { DEFAULT_LEARNING_CONFIG } from './types';
import { logAutoImprovement } from './autoImprovementLog';
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

export interface RegressionMonitorInput {
  userId: string;
  currentMetrics: PerformanceMetrics;
  monitoringPeriod?: number;
  threshold?: number;
}

export interface RegressionMonitorResult extends RegressionRollbackResult {
  monitored: boolean;
  reason?: string;
  activeVersion?: number;
  previousVersion?: number;
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
      logAutoImprovement("Régression", "detectAndRollback — pas de régression", {
        previousScore: comparison.previousScore,
        currentScore: comparison.currentScore,
        percentDecrease: comparison.percentDecrease,
        threshold: comparison.threshold,
      });
      return {
        ...comparison,
        rolledBack: false,
        restoredVersion: null,
        ineffectiveProposalIds: [],
      };
    }

    logAutoImprovement("Régression", "Régression détectée — rollback en cours", {
      userId: input.userId,
      activeVersion: input.activeVersion,
      previousVersion: input.previousVersion,
      percentDecrease: comparison.percentDecrease,
      threshold: comparison.threshold,
    });

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

    logAutoImprovement("Régression", "detectAndRollback — résultat", {
      rolledBack: Boolean(restoredVersion),
      percentDecrease: comparison.percentDecrease,
      restoredVersion: restoredVersion?.version,
      ineffectiveProposalIds,
    });

    return {
      ...comparison,
      rolledBack: Boolean(restoredVersion),
      restoredVersion,
      ineffectiveProposalIds,
    };
  }


  async monitorActiveVersion(input: RegressionMonitorInput): Promise<RegressionMonitorResult> {
    const threshold = input.threshold ?? DEFAULT_LEARNING_CONFIG.regressionThreshold;
    const monitoringPeriod = input.monitoringPeriod ?? DEFAULT_LEARNING_CONFIG.monitoringPeriod;
    const history = await this.versionManagerFactory(input.userId).getHistory();
    const activeVersion = history.versions.find((version) => version.version === history.activeVersion);

    logAutoImprovement("Régression", "monitorActiveVersion — entrée", {
      userId: input.userId,
      threshold,
      monitoringPeriod,
      turnCount: input.currentMetrics.turnCount,
      compositeScore: input.currentMetrics.compositeQualityScore,
      activeVersionId: activeVersion?.version,
      historyLength: history.versions.length,
    });

    if (!activeVersion) {
      const r = this.unmonitoredResult(input.currentMetrics, threshold, 'No active prompt version found.');
      logAutoImprovement("Régression", "monitorActiveVersion — non surveillé", { reason: r.reason });
      return r;
    }

    if (input.currentMetrics.turnCount < monitoringPeriod) {
      const r = this.unmonitoredResult(
        input.currentMetrics,
        threshold,
        `Monitoring period not complete (${input.currentMetrics.turnCount}/${monitoringPeriod} turns).`,
        activeVersion.version,
      );
      logAutoImprovement("Régression", "monitorActiveVersion — période incomplète", {
        reason: r.reason,
        activeVersion: activeVersion.version,
      });
      return r;
    }

    const activeIndex = history.versions.findIndex((version) => version.version === activeVersion.version);
    const previousVersion = activeIndex > 0 ? history.versions[activeIndex - 1] : undefined;

    if (!previousVersion?.performanceMetrics) {
      const r = this.unmonitoredResult(
        input.currentMetrics,
        threshold,
        'No previous version baseline metrics found.',
        activeVersion.version,
      );
      logAutoImprovement("Régression", "monitorActiveVersion — pas de baseline", { reason: r.reason });
      return r;
    }

    const result = await this.detectAndRollback({
      userId: input.userId,
      previousVersion: previousVersion.version,
      activeVersion: activeVersion.version,
      previousMetrics: previousVersion.performanceMetrics,
      currentMetrics: input.currentMetrics,
      threshold,
      proposals: activeVersion.appliedProposals.map((proposalId) => ({
        id: proposalId,
        targetSection: 'CORE OPERATIONAL RULES',
        proposedChange: '',
        justification: 'Marked ineffective after monitored regression rollback.',
        motivatingData: { patterns: [], metrics: {} },
        createdAt: activeVersion.timestamp,
        status: 'applied',
      })),
    });

    logAutoImprovement("Régression", "monitorActiveVersion — comparaison terminée", {
      monitored: true,
      rolledBack: result.rolledBack,
      isRegression: result.isRegression,
      percentDecrease: result.percentDecrease,
      previousScore: result.previousScore,
      currentScore: result.currentScore,
      activeVersion: activeVersion.version,
      previousVersion: previousVersion.version,
    });

    return {
      ...result,
      monitored: true,
      activeVersion: activeVersion.version,
      previousVersion: previousVersion.version,
    };
  }

  private unmonitoredResult(
    currentMetrics: PerformanceMetrics,
    threshold: number,
    reason: string,
    activeVersion?: number,
  ): RegressionMonitorResult {
    return {
      monitored: false,
      reason,
      activeVersion,
      previousScore: 0,
      currentScore: this.clampScore(currentMetrics.compositeQualityScore),
      percentDecrease: 0,
      threshold,
      isRegression: false,
      rolledBack: false,
      restoredVersion: null,
      ineffectiveProposalIds: [],
    };
  }

  private clampScore(score: number): number {
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, score));
  }
}

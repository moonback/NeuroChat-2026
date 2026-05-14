import { loadAllSessions } from '../conversationMemory';
import { buildSystemPrompt } from '../systemPrompt';
import { logAutoImprovement } from './autoImprovementLog';
import { LearningCycleOrchestrator } from './learningCycleOrchestrator';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { PromptOptimizer } from './promptOptimizer';
import { RegressionDetector } from './regressionDetector';
import { getLearningStorage } from './storage';
import type { LearningCycleStatus } from './types';

export interface LearningCycleRunnerOptions {
  currentPrompt?: string;
  manual?: boolean;
  now?: () => number;
}

export async function runLearningCycleForUser(
  userId: string,
  options: LearningCycleRunnerOptions = {},
): Promise<LearningCycleStatus> {
  const now = options.now ?? (() => Date.now());
  const t0 = now();
  const storage = getLearningStorage(userId);
  const data = await storage.load();

  logAutoImprovement("Cycle", "Démarrage runLearningCycleForUser", {
    userId,
    manual: Boolean(options.manual),
    t0,
    config: {
      enabled: data.config.enabled,
      triggerAfterTurns: data.config.triggerAfterTurns,
      maxProposalsPerCycle: data.config.maxProposalsPerCycle,
      maxCyclesPerDay: data.config.maxCyclesPerDay,
      regressionThreshold: data.config.regressionThreshold,
      monitoringPeriod: data.config.monitoringPeriod,
    },
  });

  const turns = loadAllSessions()
    .filter((session) => session.userName === userId)
    .flatMap((session) => session.turns);

  logAutoImprovement("Données", "Sessions utilisateur agrégées", {
    userId,
    turnCount: turns.length,
    feedbackSignals: data.feedback.signals.length,
    versions: data.versionHistory.versions.length,
    activeVersion: data.versionHistory.activeVersion,
    cycles24h: data.cycleHistory.filter((c) => now() - c.startTime < 86_400_000).length,
  });

  if (!options.manual && !data.config.enabled) {
    logAutoImprovement("Cycle", "Arrêt — apprentissage automatique désactivé", { userId });
    const disabled: LearningCycleStatus = {
      cycleId: `cycle_${now()}`,
      startTime: now(),
      endTime: now(),
      phase: 'failed',
      proposalsGenerated: 0,
      proposalsValidated: 0,
      proposalsApplied: 0,
      errors: ['Automatic learning is disabled.'],
      success: false,
    };
    await storage.addCycleStatus(disabled);
    logAutoImprovement("Cycle", "Statut enregistré (désactivé)", disabled);
    return disabled;
  }

  if (turns.length === 0) {
    logAutoImprovement("Cycle", "Arrêt — aucun tour de conversation pour cet utilisateur", { userId });
    const empty: LearningCycleStatus = {
      cycleId: `cycle_${now()}`,
      startTime: now(),
      endTime: now(),
      phase: 'failed',
      proposalsGenerated: 0,
      proposalsValidated: 0,
      proposalsApplied: 0,
      errors: ['No conversation turns available for learning.'],
      success: false,
    };
    await storage.addCycleStatus(empty);
    logAutoImprovement("Cycle", "Statut enregistré (vide)", empty);
    return empty;
  }

  const analyzer = new PerformanceAnalyzer();
  const report = analyzer.analyze({
    turns,
    feedbackSignals: data.feedback.signals,
  });

  logAutoImprovement("Analyse", "Rapport de performance (runner)", {
    compositeQualityScore: report.metrics.compositeQualityScore,
    concisionRatio: report.metrics.concisionRatio,
    contextAwareness: report.metrics.contextAwareness,
    proactivity: report.metrics.proactivity,
    userSatisfaction: report.metrics.userSatisfaction,
    patterns: report.patterns.map((p) => ({
      type: p.type,
      description: p.description,
      frequency: p.frequency,
      severity: p.severity,
    })),
    improvementAreas: report.improvementAreas,
  });

  const regression = await new RegressionDetector().monitorActiveVersion({
    userId,
    currentMetrics: report.metrics,
    threshold: data.config.regressionThreshold,
    monitoringPeriod: data.config.monitoringPeriod,
  });

  logAutoImprovement("Régression", "Surveillance version active", {
    monitored: regression.monitored,
    rolledBack: regression.rolledBack,
    reason: regression.reason,
    previousScore: regression.previousScore,
    currentScore: regression.currentScore,
    percentDecrease: regression.percentDecrease,
    threshold: regression.threshold,
    activeVersion: regression.activeVersion,
    previousVersion: regression.previousVersion,
  });

  if (regression.monitored && regression.rolledBack) {
    logAutoImprovement("Régression", "Rollback effectué — fin de cycle sans nouvelles propositions", {
      userId,
      restoredVersion: regression.restoredVersion?.version,
    });
    const rolledBack: LearningCycleStatus = {
      cycleId: `cycle_${now()}`,
      startTime: now(),
      endTime: now(),
      phase: 'completed',
      proposalsGenerated: 0,
      proposalsValidated: 0,
      proposalsApplied: 0,
      errors: [],
      success: true,
    };
    await storage.addCycleStatus(rolledBack);
    logAutoImprovement("Cycle", "Statut enregistré (rollback régression)", rolledBack);
    return rolledBack;
  }

  const optimizer = new PromptOptimizer({ maxProposals: data.config.maxProposalsPerCycle, now });
  const proposals = optimizer.generateProposals(report, {
    userId,
    maxProposals: data.config.maxProposalsPerCycle,
    now,
  });

  logAutoImprovement("Optimisation", "Propositions générées", {
    count: proposals.length,
    ids: proposals.map((p) => p.id),
    targets: proposals.map((p) => p.targetSection),
  });

  if (proposals.length === 0) {
    logAutoImprovement("Optimisation", "Aucune proposition — cycle no-op", { userId, durationMs: now() - t0 });
    const noOp: LearningCycleStatus = {
      cycleId: `cycle_${now()}`,
      startTime: now(),
      endTime: now(),
      phase: 'completed',
      proposalsGenerated: 0,
      proposalsValidated: 0,
      proposalsApplied: 0,
      errors: [],
      success: true,
    };
    await storage.addCycleStatus(noOp);
    logAutoImprovement("Cycle", "Statut enregistré (no-op)", noOp);
    return noOp;
  }

  const orchestrator = new LearningCycleOrchestrator({ analyzer, now });
  logAutoImprovement("Orchestration", "Passage à LearningCycleOrchestrator.runCycle", {
    userId,
    proposalCount: proposals.length,
  });
  const finalStatus = await orchestrator.runCycle({
    userId,
    turns,
    proposals,
    currentPrompt: options.currentPrompt ?? buildSystemPrompt('robot', { userName: userId }),
  });
  logAutoImprovement("Cycle", "Fin runLearningCycleForUser", {
    userId,
    success: finalStatus.success,
    phase: finalStatus.phase,
    proposalsGenerated: finalStatus.proposalsGenerated,
    proposalsValidated: finalStatus.proposalsValidated,
    proposalsApplied: finalStatus.proposalsApplied,
    errors: finalStatus.errors,
    durationMs: now() - t0,
  });
  return finalStatus;
}

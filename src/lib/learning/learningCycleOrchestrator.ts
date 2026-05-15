import type { ConversationTurn } from '../conversationMemory';
import type { ImprovementProposal, LearningCycleStatus } from './types';
import { logAutoImprovement, truncateForLog } from './autoImprovementLog';
import { getLearningStorage } from './storage';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { ImprovementValidator } from './improvementValidator';
import { PromptVersionManager } from './promptVersionManager';
import { applyImprovementProposals } from './promptApplication';

export interface LearningCycleDeps {
  analyzer?: PerformanceAnalyzer;
  validator?: ImprovementValidator;
  now?: () => number;
}

export interface CycleInput {
  userId: string;
  turns: ConversationTurn[];
  proposals: ImprovementProposal[];
  currentPrompt: string;
  baselineScore?: number;
}

export class LearningCycleOrchestrator {
  private analyzer: PerformanceAnalyzer;
  private validator: ImprovementValidator;
  private now: () => number;

  constructor(deps: LearningCycleDeps = {}) {
    this.analyzer = deps.analyzer ?? new PerformanceAnalyzer();
    this.validator = deps.validator ?? new ImprovementValidator();
    this.now = deps.now ?? (() => Date.now());
  }

  async runCycle(input: CycleInput): Promise<LearningCycleStatus> {
    const startTime = this.now();
    const storage = getLearningStorage(input.userId);
    const existing = await storage.load();

    logAutoImprovement("Orchestration", "runCycle — entrée", {
      userId: input.userId,
      startTime,
      turnCount: input.turns.length,
      proposalCount: input.proposals.length,
      promptLength: input.currentPrompt.length,
      baselineScore: input.baselineScore,
    });

    const previousDay = existing.cycleHistory
      .filter((c) => this.now() - c.startTime < 24 * 60 * 60 * 1000)
      .length;

    if (previousDay >= existing.config.maxCyclesPerDay) {
      const blocked: LearningCycleStatus = {
        cycleId: `cycle_${startTime}`,
        startTime,
        endTime: this.now(),
        phase: 'failed',
        proposalsGenerated: input.proposals.length,
        proposalsValidated: 0,
        proposalsApplied: 0,
        errors: ['Learning cycle limit reached for the last 24 hours.'],
        success: false,
      };
      logAutoImprovement("Orchestration", "Quota cycles 24h atteint", {
        userId: input.userId,
        previousDay,
        maxCyclesPerDay: existing.config.maxCyclesPerDay,
      });
      await storage.addCycleStatus(blocked);
      logAutoImprovement("Orchestration", "Statut quota enregistré", blocked);
      return blocked;
    }

    try {
      logAutoImprovement("Orchestration", "Phase analyse (orchestrateur)", {
        userId: input.userId,
        feedbackSignalCount: existing.feedback.signals.length,
      });
      const report = this.analyzer.analyze({
        turns: input.turns,
        feedbackSignals: existing.feedback.signals,
        baselineScore: input.baselineScore,
      });

      logAutoImprovement("Orchestration", "Métriques post-analyse (orchestrateur)", {
        compositeQualityScore: report.metrics.compositeQualityScore,
        improvementAreas: report.improvementAreas,
        patternCount: report.patterns.length,
      });

      logAutoImprovement("Orchestration", "Phase validation", {
        proposalIds: input.proposals.map((p) => p.id),
        maxApplied: existing.config.maxProposalsPerCycle,
      });
      const validation = this.validator.validateBatch(input.proposals, {
        originalPrompt: input.currentPrompt,
        maxAppliedProposals: existing.config.maxProposalsPerCycle,
      });

      logAutoImprovement("Orchestration", "Résultat validation", {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      });

      if (!validation.isValid) {
        const failed: LearningCycleStatus = {
          cycleId: `cycle_${startTime}`,
          startTime,
          endTime: this.now(),
          phase: 'failed',
          proposalsGenerated: input.proposals.length,
          proposalsValidated: 0,
          proposalsApplied: 0,
          errors: validation.errors,
          success: false,
        };
        await storage.addCycleStatus(failed);
        logAutoImprovement("Orchestration", "Cycle échoué — validation", failed);
        return failed;
      }

      logAutoImprovement("Orchestration", "Phase application au prompt", {
        maxProposals: existing.config.maxProposalsPerCycle,
      });
      const application = applyImprovementProposals(
        input.currentPrompt,
        input.proposals,
        existing.config.maxProposalsPerCycle,
      );
      const accepted = application.appliedProposals;
      logAutoImprovement("Orchestration", "Application prompt terminée", {
        appliedCount: accepted.length,
        skippedCount: application.skippedProposals.length,
        newPromptLength: application.promptText.length,
        deltaChars: application.promptText.length - input.currentPrompt.length,
        appliedIds: accepted.map((p) => p.id),
      });

      const manager = new PromptVersionManager(input.userId);
      await manager.createVersion({
        promptText: application.promptText,
        changeDescription: `Applied ${accepted.length} auto-improvements`,
        appliedProposals: accepted,
        performanceMetrics: report.metrics,
      });

      const completed: LearningCycleStatus = {
        cycleId: `cycle_${startTime}`,
        startTime,
        endTime: this.now(),
        phase: 'completed',
        proposalsGenerated: input.proposals.length,
        proposalsValidated: accepted.length,
        proposalsApplied: accepted.length,
        errors: [],
        success: true,
      };
      await storage.addCycleStatus(completed);
      logAutoImprovement("Orchestration", "Cycle terminé avec succès", {
        ...completed,
        promptPreview: truncateForLog(application.promptText, 400),
      });
      return completed;
    } catch (error) {
      logAutoImprovement("Orchestration", "Exception durant runCycle", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const failed: LearningCycleStatus = {
        cycleId: `cycle_${startTime}`,
        startTime,
        endTime: this.now(),
        phase: 'failed',
        proposalsGenerated: input.proposals.length,
        proposalsValidated: 0,
        proposalsApplied: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        success: false,
      };
      await storage.addCycleStatus(failed);
      logAutoImprovement("Orchestration", "Cycle enregistré en échec", failed);
      return failed;
    }
  }
}

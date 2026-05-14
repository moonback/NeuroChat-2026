import type { ConversationTurn } from '../conversationMemory';
import type { ImprovementProposal, LearningCycleStatus } from './types';
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
      await storage.addCycleStatus(blocked);
      return blocked;
    }

    try {
      const report = this.analyzer.analyze({
        turns: input.turns,
        feedbackSignals: existing.feedback.signals,
        baselineScore: input.baselineScore,
      });

      const validation = this.validator.validateBatch(input.proposals, {
        originalPrompt: input.currentPrompt,
        maxAppliedProposals: existing.config.maxProposalsPerCycle,
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
        return failed;
      }

      const application = applyImprovementProposals(
        input.currentPrompt,
        input.proposals,
        existing.config.maxProposalsPerCycle,
      );
      const accepted = application.appliedProposals;
      const manager = new PromptVersionManager(input.userId);
      await manager.createVersion({
        promptText: application.promptText,
        changeDescription: `Applied ${accepted.length} auto-improvements`,
        appliedProposals: accepted.map((p) => p.id),
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
      return completed;
    } catch (error) {
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
      return failed;
    }
  }
}

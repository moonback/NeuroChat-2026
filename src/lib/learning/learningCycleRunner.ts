import { loadAllSessions } from '../conversationMemory';
import { buildSystemPrompt } from '../systemPrompt';
import { LearningCycleOrchestrator } from './learningCycleOrchestrator';
import { PerformanceAnalyzer } from './performanceAnalyzer';
import { PromptOptimizer } from './promptOptimizer';
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
  const storage = getLearningStorage(userId);
  const data = await storage.load();
  const turns = loadAllSessions()
    .filter((session) => session.userName === userId)
    .flatMap((session) => session.turns);

  if (!options.manual && !data.config.enabled) {
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
    return disabled;
  }

  if (turns.length === 0) {
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
    return empty;
  }

  const analyzer = new PerformanceAnalyzer();
  const report = analyzer.analyze({
    turns,
    feedbackSignals: data.feedback.signals,
  });
  const optimizer = new PromptOptimizer({ maxProposals: data.config.maxProposalsPerCycle, now });
  const proposals = optimizer.generateProposals(report, {
    userId,
    maxProposals: data.config.maxProposalsPerCycle,
    now,
  });

  if (proposals.length === 0) {
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
    return noOp;
  }

  const orchestrator = new LearningCycleOrchestrator({ analyzer, now });
  return orchestrator.runCycle({
    userId,
    turns,
    proposals,
    currentPrompt: options.currentPrompt ?? buildSystemPrompt('robot', { userName: userId }),
  });
}

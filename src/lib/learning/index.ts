/**
 * Self-improving system prompt - Core module exports.
 * 
 * This module provides the foundation for the self-improving system prompt feature:
 * - Type definitions for feedback, metrics, proposals, and versions
 * - Storage layer with encryption for learning data
 * - Safety constraint management to protect immutable prompt sections
 */

// Export all types
export type {
  FeedbackSignal,
  FeedbackData,
  PerformanceMetric,
  PerformanceMetrics,
  ConversationPattern,
  PerformanceReport,
  ImprovementProposal,
  ValidationResult,
  PromptVersion,
  PromptVersionHistory,
  SafetyConstraintConfig,
  LearningCycleStatus,
  LearningCycleConfig,
  EncryptedLearningData,
  LearningData,
} from './types';

// Export constants
export {
  DEFAULT_SAFETY_CONSTRAINTS,
  DEFAULT_LEARNING_CONFIG,
} from './types';

// Export storage utilities
export {
  LearningDataStorage,
  getLearningStorage,
} from './storage';

// Export safety constraint management
export {
  SafetyConstraintManager,
  defaultSafetyManager,
} from './safetyConstraints';


// Export feedback collection
export {
  FeedbackCollector,
} from './feedbackCollector';


// Export performance analysis
export {
  PerformanceAnalyzer,
} from './performanceAnalyzer';


// Export improvement validation
export {
  ImprovementValidator,
} from './improvementValidator';


// Export prompt version management
export {
  PromptVersionManager,
} from './promptVersionManager';


// Export learning cycle automation
export {
  LearningCycleOrchestrator,
} from './learningCycleOrchestrator';


// Export regression detection
export {
  RegressionDetector,
} from './regressionDetector';
export type {
  RegressionComparison,
  RegressionRollbackInput,
  RegressionRollbackResult,
  RegressionMonitorInput,
  RegressionMonitorResult,
} from './regressionDetector';

// Export security logging
export {
  SecurityLogger,
  defaultSecurityLogger,
} from './securityLogger';
export type {
  SecurityEvent,
  SecurityEventType,
} from './securityLogger';


// Export prompt optimization
export {
  PromptOptimizer,
} from './promptOptimizer';
export type {
  PromptOptimizerOptions,
} from './promptOptimizer';


// Export prompt application helpers
export {
  applyImprovementProposals,
  countPromptSections,
} from './promptApplication';
export type {
  PromptApplicationResult,
} from './promptApplication';


// Export learning cycle runner
export {
  runLearningCycleForUser,
} from './learningCycleRunner';
export type {
  LearningCycleRunnerOptions,
} from './learningCycleRunner';

export {
  logAutoImprovement,
  truncateForLog,
  AUTO_IMPROVEMENT_LOG_PREFIX,
} from './autoImprovementLog';

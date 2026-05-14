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

/**
 * Core TypeScript interfaces for the self-improving system prompt feature.
 * These types define the data structures for feedback collection, performance metrics,
 * improvement proposals, and prompt version management.
 */

// ============================================================================
// Feedback Data Types
// ============================================================================

/**
 * Represents a single feedback signal collected from a conversation turn.
 * Can be either implicit (detected from user behavior) or explicit (user-provided).
 */
export interface FeedbackSignal {
  /** Unique identifier for this feedback signal */
  id: string;
  /** Timestamp when the feedback was collected */
  timestamp: number;
  /** Session identifier to group related feedback */
  sessionId: string;
  /** Type of feedback signal */
  type: 'implicit' | 'explicit';
  /** Sentiment: positive, negative, or neutral */
  sentiment: 'positive' | 'negative' | 'neutral';
  /** Specific signal category */
  category: 
    | 'user_interruption'
    | 'clarification_request'
    | 'repeated_question'
    | 'follow_up_engagement'
    | 'task_completion'
    | 'positive_acknowledgment'
    | 'explicit_positive'
    | 'explicit_negative';
  /** Optional text content of the feedback */
  content?: string;
  /** Associated conversation turn index */
  turnIndex: number;
  /** Optional metadata for additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Collection of feedback signals for analysis.
 */
export interface FeedbackData {
  /** All collected feedback signals */
  signals: FeedbackSignal[];
  /** User profile identifier */
  userId: string;
  /** When this feedback collection was last updated */
  lastUpdated: number;
}

// ============================================================================
// Performance Metrics Types
// ============================================================================

/**
 * Individual performance metric measurement.
 */
export interface PerformanceMetric {
  /** Metric name/identifier */
  name: string;
  /** Numeric value of the metric */
  value: number;
  /** Timestamp when measured */
  timestamp: number;
  /** Optional context about the measurement */
  context?: string;
}

/**
 * Aggregated performance metrics for a time period.
 */
export interface PerformanceMetrics {
  /** Response concision ratio (actual words / target range) */
  concisionRatio: number;
  /** Context awareness percentage (0-100) */
  contextAwareness: number;
  /** Proactivity percentage (0-100) */
  proactivity: number;
  /** User satisfaction score (0-100) */
  userSatisfaction: number;
  /** Composite quality score (0-100) */
  compositeQualityScore: number;
  /** Number of conversation turns analyzed */
  turnCount: number;
  /** Time period start */
  periodStart: number;
  /** Time period end */
  periodEnd: number;
  /** Individual metric measurements */
  individualMetrics: PerformanceMetric[];
}

/**
 * Pattern detected in conversation analysis.
 */
export interface ConversationPattern {
  /** Pattern type */
  type: 'failure' | 'success';
  /** Pattern description */
  description: string;
  /** Frequency of occurrence */
  frequency: number;
  /** Impact severity (1-10) */
  severity: number;
  /** Example conversation turn indices */
  examples: number[];
  /** Suggested improvement area */
  improvementArea?: string;
}

/**
 * Performance analysis report.
 */
export interface PerformanceReport {
  /** Aggregated metrics */
  metrics: PerformanceMetrics;
  /** Detected patterns */
  patterns: ConversationPattern[];
  /** Prioritized improvement areas */
  improvementAreas: string[];
  /** Comparison with baseline (if available) */
  baselineComparison?: {
    previousScore: number;
    currentScore: number;
    change: number;
  };
  /** Report generation timestamp */
  timestamp: number;
}

// ============================================================================
// Improvement Proposal Types
// ============================================================================

/**
 * A proposed modification to the system prompt.
 */
export interface ImprovementProposal {
  /** Unique identifier */
  id: string;
  /** Target section of the prompt to modify */
  targetSection: string;
  /** Proposed modification text */
  proposedChange: string;
  /** Justification based on performance data */
  justification: string;
  /** Performance data that motivated this proposal */
  motivatingData: {
    patterns: string[];
    metrics: Record<string, number>;
  };
  /** Creation timestamp */
  createdAt: number;
  /** Validation status */
  status: 'pending' | 'validated' | 'rejected' | 'applied' | 'ineffective';
  /** Rejection reason (if rejected) */
  rejectionReason?: string;
}

/**
 * Validation result for an improvement proposal.
 */
export interface ValidationResult {
  /** Whether the proposal is valid */
  isValid: boolean;
  /** Validation errors (if any) */
  errors: string[];
  /** Validation warnings (if any) */
  warnings: string[];
  /** Timestamp of validation */
  timestamp: number;
}

// ============================================================================
// Prompt Version Types
// ============================================================================

/**
 * A version of the system prompt.
 */
export interface PromptVersion {
  /** Version number (incremental) */
  version: number;
  /** Complete prompt text */
  promptText: string;
  /** Timestamp when this version was created */
  timestamp: number;
  /** Description of changes in this version */
  changeDescription: string;
  /** Improvement proposals applied in this version */
  appliedProposals: string[]; // IDs of applied proposals
  /** Performance metrics for this version */
  performanceMetrics?: PerformanceMetrics;
  /** Whether this version is currently active */
  isActive: boolean;
}

/**
 * Version history management.
 */
export interface PromptVersionHistory {
  /** All stored versions (max 20) */
  versions: PromptVersion[];
  /** Currently active version number */
  activeVersion: number;
  /** User profile identifier */
  userId: string;
  /** Last update timestamp */
  lastUpdated: number;
}

// ============================================================================
// Safety Constraint Types
// ============================================================================

/**
 * Configuration for safety constraints.
 */
export interface SafetyConstraintConfig {
  /** Immutable prompt sections that cannot be modified */
  immutableSections: string[];
  /** Modifiable prompt sections */
  modifiableSections: string[];
  /** Maximum prompt length multiplier (relative to original) */
  maxLengthMultiplier: number;
  /** Minimum prompt length multiplier (relative to original) */
  minLengthMultiplier: number;
  /** Core personality traits that must be preserved */
  corePersonalityTraits: string[];
}

/**
 * Default safety constraint configuration.
 */
export const DEFAULT_SAFETY_CONSTRAINTS: SafetyConstraintConfig = {
  immutableSections: [
    'IDENTITY & PERSONA',
    'SAFETY & PRIVACY',
    'LIVE VOICE API CONSTRAINTS (TTS OPTIMIZATION)',
  ],
  modifiableSections: [
    'CORE OPERATIONAL RULES',
    'RESPONSE FORMAT',
    'CURRENT CONFIGURATION',
  ],
  maxLengthMultiplier: 1.5,
  minLengthMultiplier: 0.8,
  corePersonalityTraits: [
    'proactif',
    'intelligent',
    'concis',
    'naturel',
    'respectueux',
  ],
};

// ============================================================================
// Learning Cycle Types
// ============================================================================

/**
 * Status of a learning cycle execution.
 */
export interface LearningCycleStatus {
  /** Cycle identifier */
  cycleId: string;
  /** Start timestamp */
  startTime: number;
  /** End timestamp (if completed) */
  endTime?: number;
  /** Current phase */
  phase: 'analysis' | 'optimization' | 'validation' | 'application' | 'completed' | 'failed';
  /** Number of proposals generated */
  proposalsGenerated: number;
  /** Number of proposals validated */
  proposalsValidated: number;
  /** Number of proposals applied */
  proposalsApplied: number;
  /** Errors encountered (if any) */
  errors: string[];
  /** Success status */
  success: boolean;
}

/**
 * Configuration for learning cycle automation.
 */
export interface LearningCycleConfig {
  /** Enable/disable automatic learning cycles */
  enabled: boolean;
  /** Trigger after this many conversation turns */
  triggerAfterTurns: number;
  /** Maximum cycles per 24-hour period */
  maxCyclesPerDay: number;
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;
  /** Maximum proposals to apply per cycle */
  maxProposalsPerCycle: number;
  /** Regression detection threshold (percentage) */
  regressionThreshold: number;
  /** Monitoring period after version change (turns) */
  monitoringPeriod: number;
}

/**
 * Default learning cycle configuration.
 */
export const DEFAULT_LEARNING_CONFIG: LearningCycleConfig = {
  enabled: true,
  triggerAfterTurns: 50,
  maxCyclesPerDay: 1,
  maxExecutionTime: 5000, // 5 seconds
  maxProposalsPerCycle: 3,
  regressionThreshold: 15, // 15% decrease triggers rollback
  monitoringPeriod: 25, // Monitor for 25 turns after change
};

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Encrypted learning data stored in localStorage.
 */
export interface EncryptedLearningData {
  /** Encrypted data payload */
  data: string;
  /** Initialization vector for decryption */
  iv: string;
  /** Timestamp of encryption */
  timestamp: number;
}

/**
 * Complete learning data structure.
 */
export interface LearningData {
  /** Feedback data */
  feedback: FeedbackData;
  /** Version history */
  versionHistory: PromptVersionHistory;
  /** Learning cycle history */
  cycleHistory: LearningCycleStatus[];
  /** Configuration */
  config: LearningCycleConfig;
  /** Last update timestamp */
  lastUpdated: number;
}

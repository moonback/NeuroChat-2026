import type {
  ConversationPattern,
  FeedbackSignal,
  PerformanceMetrics,
  PerformanceMetric,
  PerformanceReport,
} from './types';
import type { ConversationTurn } from '../conversationMemory';

interface AnalyzeInput {
  turns: ConversationTurn[];
  feedbackSignals: FeedbackSignal[];
  baselineScore?: number;
}

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

export class PerformanceAnalyzer {
  analyze(input: AnalyzeInput): PerformanceReport {
    const now = Date.now();
    const metrics = this.computeMetrics(input.turns, input.feedbackSignals, now);
    const patterns = this.detectPatterns(input.feedbackSignals);
    const improvementAreas = this.prioritizeImprovementAreas(patterns);

    return {
      metrics,
      patterns,
      improvementAreas,
      baselineComparison: input.baselineScore === undefined
        ? undefined
        : {
            previousScore: input.baselineScore,
            currentScore: metrics.compositeQualityScore,
            change: metrics.compositeQualityScore - input.baselineScore,
          },
      timestamp: now,
    };
  }

  computeMetrics(turns: ConversationTurn[], feedbackSignals: FeedbackSignal[], timestamp = Date.now()): PerformanceMetrics {
    const assistantTurns = turns.filter((t) => t.speaker === 'assistant');
    const avgWords = assistantTurns.length === 0
      ? 0
      : assistantTurns.reduce((sum, t) => sum + this.countWords(t.message), 0) / assistantTurns.length;

    const targetMin = 35;
    const targetMax = 45;
    const targetMid = (targetMin + targetMax) / 2;
    const concisionRatio = targetMid === 0 ? 0 : avgWords / targetMid;
    const concisionScore = clamp(100 - Math.abs(1 - concisionRatio) * 100);

    const contextAwareTurns = assistantTurns.filter((t) => /comme|plus tôt|précédent|tu as dit|historique|session/i.test(t.message)).length;
    const contextAwareness = assistantTurns.length === 0 ? 0 : clamp((contextAwareTurns / assistantTurns.length) * 100);

    const proactiveTurns = assistantTurns.filter((t) => /\?|je peux|souhaites-tu|veux-tu|prochaine étape|next step/i.test(t.message)).length;
    const proactivity = assistantTurns.length === 0 ? 0 : clamp((proactiveTurns / assistantTurns.length) * 100);

    const positives = feedbackSignals.filter((s) => s.sentiment === 'positive').length;
    const negatives = feedbackSignals.filter((s) => s.sentiment === 'negative').length;
    const totalSentiment = positives + negatives;
    const userSatisfaction = totalSentiment === 0 ? 50 : clamp((positives / totalSentiment) * 100);

    const compositeQualityScore = clamp(
      concisionScore * 0.25 +
      contextAwareness * 0.25 +
      proactivity * 0.2 +
      userSatisfaction * 0.3,
    );

    const individualMetrics: PerformanceMetric[] = [
      { name: 'concision', value: concisionScore, timestamp, context: `avgWords=${avgWords.toFixed(2)}` },
      { name: 'contextAwareness', value: contextAwareness, timestamp },
      { name: 'proactivity', value: proactivity, timestamp },
      { name: 'userSatisfaction', value: userSatisfaction, timestamp },
      { name: 'compositeQualityScore', value: compositeQualityScore, timestamp },
    ];

    return {
      concisionRatio,
      contextAwareness,
      proactivity,
      userSatisfaction,
      compositeQualityScore,
      turnCount: turns.length,
      periodStart: turns[0]?.timestamp ?? timestamp,
      periodEnd: turns[turns.length - 1]?.timestamp ?? timestamp,
      individualMetrics,
    };
  }

  detectPatterns(feedbackSignals: FeedbackSignal[]): ConversationPattern[] {
    const counts = new Map<string, { positive: number; negative: number; examples: number[] }>();

    feedbackSignals.forEach((signal) => {
      const current = counts.get(signal.category) ?? { positive: 0, negative: 0, examples: [] };
      if (signal.sentiment === 'positive') current.positive += 1;
      if (signal.sentiment === 'negative') current.negative += 1;
      current.examples.push(signal.turnIndex);
      counts.set(signal.category, current);
    });

    return Array.from(counts.entries()).map<ConversationPattern>(([category, c]) => {
      const negativeDominant = c.negative >= c.positive;
      return {
        type: negativeDominant ? 'failure' : 'success',
        description: `${category} observed`,
        frequency: c.positive + c.negative,
        severity: clamp(Math.round((c.negative / Math.max(1, c.positive + c.negative)) * 10), 1, 10),
        examples: c.examples.slice(0, 5),
        improvementArea: negativeDominant ? this.mapCategoryToArea(category) : undefined,
      };
    }).sort((a, b) => b.frequency - a.frequency);
  }

  prioritizeImprovementAreas(patterns: ConversationPattern[]): string[] {
    return patterns
      .filter((p) => p.type === 'failure' && p.improvementArea)
      .sort((a, b) => (b.frequency * b.severity) - (a.frequency * a.severity))
      .map((p) => p.improvementArea!)
      .filter((value, idx, arr) => arr.indexOf(value) === idx);
  }

  private mapCategoryToArea(category: string): string {
    if (category.includes('clarification')) return 'Improve clarity and structure';
    if (category.includes('repeated_question')) return 'Increase directness and completeness';
    if (category.includes('user_interruption')) return 'Reduce verbosity and lead with the answer';
    return 'General response quality';
  }

  private countWords(text: string): number {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    return tokens.length;
  }
}

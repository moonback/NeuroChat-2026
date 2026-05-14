import type { ConversationTurn } from '../conversationMemory';
import type { FeedbackData, FeedbackSignal } from './types';
import { logAutoImprovement, truncateForLog } from './autoImprovementLog';
import { getLearningStorage } from './storage';

const NEGATIVE_ACK_PATTERNS = [/\b(not helpful|doesn'?t help|wrong|incorrect|stop|nope|that'?s not what i asked)\b/i];
const CLARIFICATION_PATTERNS = [/\b(what do you mean|can you clarify|i don'?t understand|explain that|clarify)\b/i];
const POSITIVE_PATTERNS = [/\b(thanks|great|perfect|awesome|exactly|that helps|nice)\b/i];
const TASK_COMPLETION_PATTERNS = [/\b(done|solved|it works|resolved|completed|fixed)\b/i];

export class FeedbackCollector {
  constructor(private readonly userId: string) {}

  async collectFromTurn(sessionId: string, turnIndex: number, turn: ConversationTurn, previousTurns: ConversationTurn[]): Promise<FeedbackSignal[]> {
    if (turn.speaker !== 'user') return [];

    const signals: FeedbackSignal[] = [];
    const text = turn.message.trim();

    if (CLARIFICATION_PATTERNS.some((p) => p.test(text))) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'negative', 'clarification_request', text));
    }

    if (NEGATIVE_ACK_PATTERNS.some((p) => p.test(text))) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'negative', 'user_interruption', text));
    }

    if (POSITIVE_PATTERNS.some((p) => p.test(text))) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'positive', 'positive_acknowledgment', text));
    }

    if (TASK_COMPLETION_PATTERNS.some((p) => p.test(text))) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'positive', 'task_completion', text));
    }

    if (this.isRepeatedQuestion(text, previousTurns)) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'negative', 'repeated_question', text));
    }

    if (this.isFollowUpEngagement(text, previousTurns)) {
      signals.push(this.createSignal(sessionId, turnIndex, 'implicit', 'positive', 'follow_up_engagement', text));
    }

    await this.appendSignals(signals);
    if (signals.length > 0) {
      logAutoImprovement("Feedback", "Signaux implicites collectés (tour utilisateur)", {
        userId: this.userId,
        sessionId,
        turnIndex,
        count: signals.length,
        categories: signals.map((s) => s.category),
        sentiments: signals.map((s) => s.sentiment),
        excerpts: signals.map((s) => truncateForLog(s.content ?? "", 120)),
      });
    }
    return signals;
  }

  async recordExplicitFeedback(sessionId: string, turnIndex: number, positive: boolean, content?: string): Promise<FeedbackSignal> {
    const signal = this.createSignal(
      sessionId,
      turnIndex,
      'explicit',
      positive ? 'positive' : 'negative',
      positive ? 'explicit_positive' : 'explicit_negative',
      content,
    );
    await this.appendSignals([signal]);
    logAutoImprovement("Feedback", "Retour utilisateur explicite enregistré", {
      userId: this.userId,
      sessionId,
      turnIndex,
      positive,
      category: signal.category,
      excerpt: truncateForLog(content ?? "", 200),
      signalId: signal.id,
    });
    return signal;
  }

  private createSignal(
    sessionId: string,
    turnIndex: number,
    type: FeedbackSignal['type'],
    sentiment: FeedbackSignal['sentiment'],
    category: FeedbackSignal['category'],
    content?: string,
  ): FeedbackSignal {
    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: Date.now(),
      sessionId,
      type,
      sentiment,
      category,
      content,
      turnIndex,
    };
  }

  private isRepeatedQuestion(userText: string, previousTurns: ConversationTurn[]): boolean {
    const userTurns = previousTurns.filter((t) => t.speaker === 'user').slice(-3);
    return userTurns.some((t) => t.message.trim().toLowerCase() === userText.toLowerCase());
  }

  private isFollowUpEngagement(userText: string, previousTurns: ConversationTurn[]): boolean {
    const previousAssistantTurn = [...previousTurns].reverse().find((t) => t.speaker === 'assistant');
    if (!previousAssistantTurn) return false;
    return /\?/.test(previousAssistantTurn.message) && userText.length > 0;
  }

  private async appendSignals(signals: FeedbackSignal[]): Promise<void> {
    if (signals.length === 0) return;
    const storage = getLearningStorage(this.userId);
    const learningData = await storage.load();

    const feedback: FeedbackData = {
      ...learningData.feedback,
      signals: [...learningData.feedback.signals, ...signals],
      userId: this.userId,
      lastUpdated: Date.now(),
    };

    await storage.updateFeedback(feedback);
    logAutoImprovement("Feedback", "Stockage mis à jour (signaux append)", {
      userId: this.userId,
      appended: signals.length,
      totalSignals: feedback.signals.length,
      ids: signals.map((s) => s.id),
    });
  }
}

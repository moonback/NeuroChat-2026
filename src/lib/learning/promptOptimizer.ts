import { loadVectorStore } from '../vectorStore';
import type { ConversationPattern, ImprovementProposal, PerformanceReport } from './types';
import { logAutoImprovement } from './autoImprovementLog';

export interface PromptOptimizerOptions {
  userId?: string;
  maxProposals?: number;
  now?: () => number;
}

interface ProposalTemplate {
  id: string;
  targetSection: ImprovementProposal['targetSection'];
  area: string;
  trigger: (report: PerformanceReport) => boolean;
  change: string;
  justification: (report: PerformanceReport) => string;
}

const PERSONALITY_GUARDRAIL = 'Reste proactif, intelligent, concis, naturel et respectueux.';

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'concision-first-answer',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Reduce verbosity and lead with the answer',
    trigger: (report) => report.metrics.concisionRatio > 1.15 || hasFailure(report.patterns, 'user_interruption'),
    change: `Commence par la réponse directe en une phrase courte, puis ajoute seulement le détail nécessaire. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Concision ratio is ${report.metrics.concisionRatio.toFixed(2)} and interruption-related patterns suggest answers should lead with the result.`,
  },
  {
    id: 'clarity-structure',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Improve clarity and structure',
    trigger: (report) => report.metrics.contextAwareness < 55 || hasFailure(report.patterns, 'clarification_request'),
    change: `Quand une demande semble ambiguë, reformule brièvement l’objectif puis donne une réponse structurée en langage simple. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Context awareness is ${report.metrics.contextAwareness.toFixed(0)}%, with clarification patterns indicating the assistant should make intent explicit.`,
  },
  {
    id: 'complete-direct-answer',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Increase directness and completeness',
    trigger: (report) => hasFailure(report.patterns, 'repeated_question') || report.metrics.userSatisfaction < 55,
    change: `Réponds complètement à la question principale avant de proposer une étape suivante, sans détour ni information non demandée. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `User satisfaction is ${report.metrics.userSatisfaction.toFixed(0)}%, and repeated-question patterns indicate missing or indirect answers.`,
  },
  {
    id: 'use-light-follow-up',
    targetSection: 'RESPONSE FORMAT',
    area: 'Increase helpful proactivity',
    trigger: (report) => report.metrics.proactivity < 35,
    change: `Termine seulement quand utile par une mini-question ou une proposition d’aide très courte, adaptée au contexte. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Proactivity is ${report.metrics.proactivity.toFixed(0)}%, below the target for helpful next-step suggestions.`,
  },
];

export class PromptOptimizer {
  private readonly maxProposals: number;
  private readonly now: () => number;

  constructor(options: PromptOptimizerOptions = {}) {
    this.maxProposals = options.maxProposals ?? 3;
    this.now = options.now ?? (() => Date.now());
  }

  async generateProposals(report: PerformanceReport, options: PromptOptimizerOptions = {}): Promise<ImprovementProposal[]> {
    const userId = options.userId;
    const maxProposals = options.maxProposals ?? this.maxProposals;
    const selected = PROPOSAL_TEMPLATES
      .filter((template) => template.trigger(report) || report.improvementAreas.includes(template.area))
      .sort((a, b) => this.priorityFor(report, b) - this.priorityFor(report, a))
      .slice(0, maxProposals);

    const proposals: ImprovementProposal[] = [];
    for (let index = 0; index < selected.length; index++) {
      const template = selected[index];
      proposals.push({
        id: `proposal_${template.id}_${this.now()}_${index}`,
        targetSection: template.targetSection,
        proposedChange: await this.withSuccessfulPatternHint(template.change, userId),
        justification: template.justification(report),
        motivatingData: {
          patterns: report.patterns.filter((pattern) => pattern.type === 'failure').map((pattern) => pattern.description).slice(0, 5),
          metrics: {
            concisionRatio: report.metrics.concisionRatio,
            contextAwareness: report.metrics.contextAwareness,
            proactivity: report.metrics.proactivity,
            userSatisfaction: report.metrics.userSatisfaction,
            compositeQualityScore: report.metrics.compositeQualityScore,
          },
        },
        createdAt: this.now(),
        status: 'pending' as const,
      });
    }

    logAutoImprovement("Optimisation", "PromptOptimizer — propositions retenues", {
      userId: userId ?? "(anon)",
      maxProposals,
      templateIds: selected.map((t) => t.id),
      areas: selected.map((t) => t.area),
      summaries: proposals.map((p) => ({
        id: p.id,
        targetSection: p.targetSection,
        justification: p.justification.slice(0, 200),
      })),
    });

    return proposals;
  }

  async extractSuccessfulPatterns(userId: string, limit: number = 3): Promise<string[]> {
    return (await loadVectorStore())
      .filter((entry) => entry.metadata.userName === userId && entry.metadata.speaker === 'assistant')
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
      .slice(0, limit)
      .map((entry) => entry.text.trim())
      .filter(Boolean);
  }

  private async withSuccessfulPatternHint(change: string, userId?: string): Promise<string> {
    if (!userId) return change;

    const successfulPatterns = await this.extractSuccessfulPatterns(userId, 1);
    if (successfulPatterns.length === 0) return change;

    const exemplar = successfulPatterns[0].slice(0, 120);
    return `${change} Inspire-toi du style des réponses réussies récentes, par exemple: “${exemplar}”.`;
  }

  private priorityFor(report: PerformanceReport, template: ProposalTemplate): number {
    const matchingAreaRank = report.improvementAreas.indexOf(template.area);
    const areaBoost = matchingAreaRank >= 0 ? 100 - matchingAreaRank : 0;
    const patternBoost = report.patterns
      .filter((pattern) => pattern.type === 'failure' && pattern.improvementArea === template.area)
      .reduce((total, pattern) => total + pattern.frequency * pattern.severity, 0);
    return areaBoost + patternBoost;
  }
}

function hasFailure(patterns: ConversationPattern[], categoryFragment: string): boolean {
  return patterns.some(
    (pattern) => pattern.type === 'failure' && pattern.description.includes(categoryFragment),
  );
}

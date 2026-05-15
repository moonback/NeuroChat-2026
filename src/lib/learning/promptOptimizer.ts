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
  minSeverity?: number;
  minFrequency?: number;
}

const PERSONALITY_GUARDRAIL = 'Reste proactif, intelligent, concis, naturel et respectueux.';

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'concision-first-answer',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Reduce verbosity and lead with the answer',
    trigger: (report) => report.metrics.concisionRatio > 1.15 || hasFailure(report.patterns, 'user_interruption'),
    change: `Commence par la réponse directe en une phrase courte, puis ajoute seulement le détail nécessaire. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Ratio de concision de ${report.metrics.concisionRatio.toFixed(2)} et interruptions détectées : priorité à la réponse directe.`,
    minSeverity: 5,
  },
  {
    id: 'clarity-structure',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Improve clarity and structure',
    trigger: (report) => report.metrics.contextAwareness < 55 || hasFailure(report.patterns, 'clarification_request'),
    change: `Quand une demande semble ambiguë, reformule brièvement l’objectif puis donne une réponse structurée en langage simple. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Conscience contextuelle de ${report.metrics.contextAwareness.toFixed(0)}% et demandes de clarification fréquentes.`,
    minSeverity: 4,
  },
  {
    id: 'complete-direct-answer',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Increase directness and completeness',
    trigger: (report) => hasFailure(report.patterns, 'repeated_question') || report.metrics.userSatisfaction < 55,
    change: `Réponds complètement à la question principale avant de proposer une étape suivante, sans détour ni information non demandée. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Satisfaction utilisateur de ${report.metrics.userSatisfaction.toFixed(0)}% et questions répétées suggérant des réponses incomplètes.`,
    minSeverity: 6,
  },
  {
    id: 'empathetic-tone',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Improve emotional intelligence and empathy',
    trigger: (report) => report.metrics.userSatisfaction < 45 || hasFailure(report.patterns, 'explicit_negative'),
    change: `Valide toujours l’émotion ou le besoin de l’utilisateur avant d’agir, en utilisant un ton chaleureux et compréhensif. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Satisfaction faible (${report.metrics.userSatisfaction.toFixed(0)}%) ou feedback négatif explicite nécessitant plus d'empathie.`,
    minSeverity: 7,
  },
  {
    id: 'proactive-choices',
    targetSection: 'RESPONSE FORMAT',
    area: 'Increase helpful proactivity',
    trigger: (report) => report.metrics.proactivity < 35,
    change: `Termine par 2 ou 3 options concrètes d'aide basées sur le contexte actuel pour guider l'utilisateur. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Proactivité de ${report.metrics.proactivity.toFixed(0)}% : l'utilisateur a besoin de suggestions plus claires pour la suite.`,
    minFrequency: 3,
  },
  {
    id: 'technical-simplicity',
    targetSection: 'CORE OPERATIONAL RULES',
    area: 'Simplify technical language',
    trigger: (report) => hasFailure(report.patterns, 'clarification_request') && report.metrics.contextAwareness > 70,
    change: `Évite le jargon technique. Explique les concepts complexes avec des analogies simples et quotidiennes. ${PERSONALITY_GUARDRAIL}`,
    justification: (report) => `Nombreuses clarifications malgré une bonne conscience du contexte : le langage est probablement trop complexe.`,
    minSeverity: 5,
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
    
    const candidates = PROPOSAL_TEMPLATES.filter((template) => {
      const isTriggered = template.trigger(report) || report.improvementAreas.includes(template.area);
      if (!isTriggered) return false;

      // Filter by min severity/frequency if specified
      const matchingPatterns = report.patterns.filter(p => p.type === 'failure' && (p.improvementArea === template.area || template.trigger(report)));
      const maxSev = matchingPatterns.length > 0 ? Math.max(...matchingPatterns.map(p => p.severity)) : 0;
      const totalFreq = matchingPatterns.reduce((sum, p) => sum + p.frequency, 0);

      if (template.minSeverity && maxSev < template.minSeverity) return false;
      if (template.minFrequency && totalFreq < template.minFrequency) return false;

      return true;
    });

    const selected = candidates
      .sort((a, b) => this.priorityFor(report, b) - this.priorityFor(report, a))
      .slice(0, maxProposals);

    const proposals: ImprovementProposal[] = [];
    for (let index = 0; index < selected.length; index++) {
      const template = selected[index];
      const proposedChange = await this.withSuccessfulPatternHint(template.change, userId);
      
      proposals.push({
        id: `proposal_${template.id}_${this.now()}_${index}`,
        targetSection: template.targetSection,
        proposedChange,
        justification: template.justification(report),
        motivatingData: {
          patterns: report.patterns
            .filter((pattern) => pattern.type === 'failure' && (pattern.improvementArea === template.area || pattern.description.includes(template.id.split('-')[0])))
            .map((pattern) => pattern.description)
            .slice(0, 5),
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
    });

    return proposals;
  }

  async extractSuccessfulPatterns(userId: string, limit: number = 3): Promise<string[]> {
    try {
      const store = await loadVectorStore();
      return store
        .filter((entry) => entry.metadata.userName === userId && entry.metadata.speaker === 'assistant')
        .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
        .slice(0, limit)
        .map((entry) => entry.text.trim())
        .filter(Boolean);
    } catch (e) {
      console.warn("Failed to extract successful patterns from vector store", e);
      return [];
    }
  }

  private async withSuccessfulPatternHint(change: string, userId?: string): Promise<string> {
    if (!userId) return change;

    const successfulPatterns = await this.extractSuccessfulPatterns(userId, 2);
    if (successfulPatterns.length === 0) return change;

    // Use up to 2 examples if they are short enough
    const exemplars = successfulPatterns
      .map(p => p.length > 100 ? p.slice(0, 97) + '...' : p)
      .map(p => `“${p}”`)
      .join(' ou ');

    return `${change} Inspire-toi de tes réussites récentes: ${exemplars}.`;
  }

  private priorityFor(report: PerformanceReport, template: ProposalTemplate): number {
    const matchingAreaRank = report.improvementAreas.indexOf(template.area);
    const areaBoost = matchingAreaRank >= 0 ? (report.improvementAreas.length - matchingAreaRank) * 50 : 0;
    
    const patternBoost = report.patterns
      .filter((pattern) => pattern.type === 'failure' && (pattern.improvementArea === template.area || template.trigger(report)))
      .reduce((total, pattern) => total + (pattern.frequency * pattern.severity), 0);
    
    return areaBoost + patternBoost;
  }
}

function hasFailure(patterns: ConversationPattern[], categoryFragment: string): boolean {
  return patterns.some(
    (pattern) => pattern.type === 'failure' && pattern.description.toLowerCase().includes(categoryFragment.toLowerCase()),
  );
}

import type { ImprovementProposal, ValidationResult } from './types';
import { DEFAULT_SAFETY_CONSTRAINTS } from './types';
import { SafetyConstraintManager } from './safetyConstraints';

export interface ValidatorOptions {
  originalPrompt: string;
  maxAppliedProposals?: number;
}

export class ImprovementValidator {
  constructor(private readonly safetyManager = new SafetyConstraintManager()) {}

  validateProposal(proposal: ImprovementProposal, options: ValidatorOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!DEFAULT_SAFETY_CONSTRAINTS.modifiableSections.includes(proposal.targetSection)) {
      errors.push(`Target section \"${proposal.targetSection}\" is not modifiable.`);
    }

    if (DEFAULT_SAFETY_CONSTRAINTS.immutableSections.includes(proposal.targetSection)) {
      errors.push(`Target section \"${proposal.targetSection}\" is immutable.`);
    }

    const lower = proposal.proposedChange.toLowerCase();
    const blockedTokens = ['ignore safety', 'disable privacy', 'reveal password', 'system prompt'];
    if (blockedTokens.some((t) => lower.includes(t))) {
      errors.push('Proposal contains forbidden safety/privacy modifications.');
      this.safetyManager.logSecurityEvent('proposal_rejected', 'Forbidden tokens detected in proposedChange', {
        proposalId: proposal.id,
      });
    }

    const personaTraits = DEFAULT_SAFETY_CONSTRAINTS.corePersonalityTraits;
    const missingTraits = personaTraits.filter((t) => !lower.includes(t));
    if (missingTraits.length > Math.floor(personaTraits.length * 0.8)) {
      warnings.push('Proposal may drift from core personality traits.');
    }

    const projectedPromptLength = options.originalPrompt.length + proposal.proposedChange.length;
    const minLen = Math.floor(options.originalPrompt.length * DEFAULT_SAFETY_CONSTRAINTS.minLengthMultiplier);
    const maxLen = Math.ceil(options.originalPrompt.length * DEFAULT_SAFETY_CONSTRAINTS.maxLengthMultiplier);
    if (projectedPromptLength < minLen || projectedPromptLength > maxLen) {
      errors.push(`Projected prompt length (${projectedPromptLength}) is outside allowed bounds (${minLen}-${maxLen}).`);
    }

    if ((options.maxAppliedProposals ?? 3) < 1) {
      errors.push('Invalid maxAppliedProposals configuration.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
    };
  }

  validateBatch(proposals: ImprovementProposal[], options: ValidatorOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const maxAllowed = options.maxAppliedProposals ?? 3;

    if (proposals.length > maxAllowed) {
      errors.push(`Too many proposals: ${proposals.length} (max ${maxAllowed}).`);
    }

    proposals.forEach((proposal) => {
      const res = this.validateProposal(proposal, options);
      errors.push(...res.errors);
      warnings.push(...res.warnings);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
    };
  }
}

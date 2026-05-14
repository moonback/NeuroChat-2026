import { describe, expect, it } from 'vitest';
import { applyImprovementProposals, countPromptSections } from '../../lib/learning/promptApplication';
import type { ImprovementProposal } from '../../lib/learning/types';

const basePrompt = `### IDENTITY & PERSONA
Tu es NeuroChat.

### CORE OPERATIONAL RULES
1. Réponds en français.

### SAFETY & PRIVACY
Respecte la confidentialité.

### RESPONSE FORMAT
Texte parlé pur.`;

function proposal(id: string, targetSection = 'CORE OPERATIONAL RULES'): ImprovementProposal {
  return {
    id,
    targetSection,
    proposedChange: `Instruction ${id}`,
    justification: 'Test improvement',
    motivatingData: { patterns: [], metrics: {} },
    createdAt: Date.now(),
    status: 'validated',
  };
}

describe('applyImprovementProposals', () => {
  it('applies validated improvements inside the target section', () => {
    const result = applyImprovementProposals(basePrompt, [proposal('p1')]);

    expect(result.appliedProposals).toHaveLength(1);
    expect(result.promptText).toContain('### CORE OPERATIONAL RULES\n1. Réponds en français.\nAmélioration validée: Instruction p1');
  });

  it('preserves immutable safety and identity section counts', () => {
    const result = applyImprovementProposals(basePrompt, [proposal('p1'), proposal('p2', 'RESPONSE FORMAT')]);

    expect(countPromptSections(result.promptText, 'IDENTITY & PERSONA')).toBe(countPromptSections(basePrompt, 'IDENTITY & PERSONA'));
    expect(countPromptSections(result.promptText, 'SAFETY & PRIVACY')).toBe(countPromptSections(basePrompt, 'SAFETY & PRIVACY'));
  });

  it('limits applied improvements to the configured maximum', () => {
    const result = applyImprovementProposals(basePrompt, [proposal('p1'), proposal('p2'), proposal('p3')], 2);

    expect(result.appliedProposals.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(result.skippedProposals.map((p) => p.id)).toEqual(['p3']);
    expect(result.promptText).not.toContain('Instruction p3');
  });

  it('skips proposals targeting missing sections', () => {
    const result = applyImprovementProposals(basePrompt, [proposal('p1', 'UNKNOWN SECTION')]);

    expect(result.appliedProposals).toHaveLength(0);
    expect(result.skippedProposals.map((p) => p.id)).toEqual(['p1']);
    expect(result.promptText).toBe(basePrompt);
  });
});

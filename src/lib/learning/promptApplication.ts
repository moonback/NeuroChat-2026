import type { ImprovementProposal } from './types';

export interface PromptApplicationResult {
  promptText: string;
  appliedProposals: ImprovementProposal[];
  skippedProposals: ImprovementProposal[];
}

const SECTION_HEADER_PATTERN = /^###\s+(.+)$/gm;

export function applyImprovementProposals(
  originalPrompt: string,
  proposals: ImprovementProposal[],
  maxProposals: number = 3,
): PromptApplicationResult {
  const selected = proposals.slice(0, Math.max(0, maxProposals));
  let promptText = originalPrompt;
  const appliedProposals: ImprovementProposal[] = [];
  const skippedProposals: ImprovementProposal[] = [];

  for (const proposal of selected) {
    const updated = appendToSection(promptText, proposal.targetSection, formatProposalInstruction(proposal));
    if (updated === promptText) {
      skippedProposals.push(proposal);
      continue;
    }

    promptText = updated;
    appliedProposals.push({ ...proposal, status: 'applied' });
  }

  skippedProposals.push(...proposals.slice(selected.length));

  return {
    promptText,
    appliedProposals,
    skippedProposals,
  };
}

export function countPromptSections(prompt: string, sectionName: string): number {
  const escaped = escapeRegExp(sectionName);
  const pattern = new RegExp(`^###\\s+${escaped}\\s*$`, 'gmi');
  return prompt.match(pattern)?.length ?? 0;
}

function appendToSection(prompt: string, targetSection: string, instruction: string): string {
  const sections = [...prompt.matchAll(SECTION_HEADER_PATTERN)];
  const targetIndex = sections.findIndex((match) => normalizeSection(match[1]) === normalizeSection(targetSection));
  if (targetIndex === -1) return prompt;

  const target = sections[targetIndex];
  const next = sections[targetIndex + 1];
  const insertionPoint = next?.index ?? prompt.length;
  const sectionBodyStart = (target.index ?? 0) + target[0].length;
  const sectionBody = prompt.slice(sectionBodyStart, insertionPoint);

  if (sectionBody.includes(instruction)) return prompt;

  const prefix = prompt.slice(0, insertionPoint).trimEnd();
  return `${prefix}\n${instruction}\n\n${prompt.slice(insertionPoint).trimStart()}`.trimEnd();
}

function formatProposalInstruction(proposal: ImprovementProposal): string {
  return `Amélioration validée: ${proposal.proposedChange}`;
}

function normalizeSection(sectionName: string): string {
  return sectionName.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

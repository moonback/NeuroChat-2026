import { beforeEach, describe, expect, it } from 'vitest';
import { addConversationTurn } from '../../lib/conversationMemory';
import { runLearningCycleForUser } from '../../lib/learning/learningCycleRunner';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import { getLearningStorage } from '../../lib/learning/storage';

const prompt = `### IDENTITY & PERSONA
Tu es NeuroChat.

### CORE OPERATIONAL RULES
1. Réponds en français.
2. Reste concis, naturel, proactif, intelligent et respectueux.
3. Donne la réponse directe avant les détails.
4. Adapte le niveau d’explication à la demande.
5. Préserve une voix claire et fluide pour la synthèse vocale.
6. Ne propose une prochaine étape que lorsqu’elle aide vraiment.

### SAFETY & PRIVACY
Respecte la confidentialité.

### RESPONSE FORMAT
Texte parlé pur.`;

describe('runLearningCycleForUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fails gracefully when no conversation turns are available', async () => {
    const status = await runLearningCycleForUser('empty-user', { manual: true, currentPrompt: prompt, now: () => 1000 });

    expect(status.success).toBe(false);
    expect(status.errors[0]).toContain('No conversation turns');
  });

  it('generates proposals and creates a prompt version for manual cycles', async () => {
    addConversationTurn('runner-user', 'assistant', 'Voici une très longue réponse qui devrait probablement être plus concise et directe pour mieux répondre à la demande de l’utilisateur sans perdre le fil.');
    addConversationTurn('runner-user', 'user', 'Peux-tu faire plus court ?');

    const status = await runLearningCycleForUser('runner-user', { manual: true, currentPrompt: prompt, now: () => 1000 });

    expect(status.errors).toEqual([]);
    expect(status.success).toBe(true);
    expect(status.proposalsGenerated).toBeGreaterThan(0);
    expect(status.proposalsApplied).toBeGreaterThan(0);

    const history = await new PromptVersionManager('runner-user').getHistory();
    expect(history.versions).toHaveLength(1);
    expect(history.versions[0].promptText).toContain('Amélioration validée:');
  });

  it('honors disabled automatic learning for non-manual cycles', async () => {
    await getLearningStorage('disabled-user').updateConfig({ enabled: false });
    addConversationTurn('disabled-user', 'assistant', 'Réponse longue à raccourcir.');

    const status = await runLearningCycleForUser('disabled-user', { currentPrompt: prompt, now: () => 1000 });

    expect(status.success).toBe(false);
    expect(status.errors[0]).toContain('disabled');
  });
});

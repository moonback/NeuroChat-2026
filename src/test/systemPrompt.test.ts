import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildSystemPromptAsync } from '../lib/systemPrompt';

describe('systemPrompt', () => {
  describe('buildSystemPrompt', () => {
    it('should build prompt with avatar personality', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('NeuroChat');
      expect(prompt).toContain('compagnon intelligent');
    });

    it('should include user name when provided', () => {
      const prompt = buildSystemPrompt('robot', 'Marie');
      expect(prompt).toContain('Marie');
      expect(prompt).toContain('Utilisateur: Marie');
    });

    it('should handle missing user name', () => {
      const prompt = buildSystemPrompt('robot', '');
      expect(prompt).toContain('Utilisateur inconnu');
    });

    it('should include operational rules', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('CORE OPERATIONAL RULES');
      expect(prompt).toContain('Honnêteté technique');
    });

    it('should include concision rules', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('Concision Flexible');
      expect(prompt).toContain('20-30 mots');
    });

    it('should include proactivity guidelines', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('Proactivité');
    });

    it('should resolve memory context with async builder', async () => {
      const prompt = await buildSystemPromptAsync('robot', {
        userName: 'Marie',
        memoryContext: 'Historique récent : Marie aime les synthèses courtes.',
      });

      expect(prompt).toContain('Historique récent : Marie aime les synthèses courtes.');
      expect(prompt).not.toContain('[object Promise]');
    });

    it('should include date and time context', () => {
      const prompt = buildSystemPrompt('robot', 'Marie');
      expect(prompt).toContain('TEMPORAL CONTEXT');
      expect(prompt).toContain(new Date().getFullYear().toString());
      expect(prompt).toMatch(/matin|après-midi|soir|nuit/);
    });
  });
});

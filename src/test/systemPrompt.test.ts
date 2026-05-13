import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../lib/systemPrompt';

describe('systemPrompt', () => {
  describe('buildSystemPrompt', () => {
    it('should build prompt with avatar personality', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('Lisa le Robot');
      expect(prompt).toContain('Bip-boup');
    });

    it('should include child name when provided', () => {
      const prompt = buildSystemPrompt('robot', 'Marie');
      expect(prompt).toContain('Marie');
      expect(prompt).toContain('Prénom enfant');
    });

    it('should handle missing child name', () => {
      const prompt = buildSystemPrompt('robot', '');
      expect(prompt).toContain('Prénom enfant inconnu');
    });

    it('should include safety guidelines', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('SAFETY');
      expect(prompt).toContain('adresse');
    });

    it('should include concision rules', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('Maximum 35 mots');
      expect(prompt).toContain('Maximum 2 phrases');
    });

    it('should include interaction guidelines', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('mini question');
    });

    it('should include well-being guidelines', () => {
      const prompt = buildSystemPrompt('robot');
      expect(prompt).toContain('SCREEN TIME MANAGEMENT');
      expect(prompt).toContain('pause yeux');
    });

    it('should include date and time context', () => {
      const prompt = buildSystemPrompt('robot', 'Marie');
      expect(prompt).toContain('TEMPORAL CONTEXT');
      expect(prompt).toContain(new Date().getFullYear().toString());
      expect(prompt).toMatch(/matin|après-midi|soir|nuit/);
    });
  });
});

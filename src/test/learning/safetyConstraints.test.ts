/**
 * Unit tests for safety constraint management.
 * Tests validation of prompt modifications and security event logging.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyConstraintManager } from '../../lib/learning/safetyConstraints';
import { DEFAULT_SAFETY_CONSTRAINTS } from '../../lib/learning/types';

describe('SafetyConstraintManager', () => {
  let manager: SafetyConstraintManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new SafetyConstraintManager();
  });

  describe('Section Classification', () => {
    it('should identify immutable sections', () => {
      expect(manager.isImmutableSection('IDENTITY & PERSONA')).toBe(true);
      expect(manager.isImmutableSection('SAFETY & PRIVACY')).toBe(true);
      expect(manager.isImmutableSection('LIVE VOICE API CONSTRAINTS (TTS OPTIMIZATION)')).toBe(true);
    });

    it('should identify modifiable sections', () => {
      expect(manager.isModifiableSection('CORE OPERATIONAL RULES')).toBe(true);
      expect(manager.isModifiableSection('RESPONSE FORMAT')).toBe(true);
      expect(manager.isModifiableSection('CURRENT CONFIGURATION')).toBe(true);
    });

    it('should reject modifications to immutable sections', () => {
      expect(manager.isImmutableSection('IDENTITY & PERSONA')).toBe(true);
      expect(manager.isModifiableSection('IDENTITY & PERSONA')).toBe(false);
    });

    it('should handle partial section name matches', () => {
      expect(manager.isImmutableSection('IDENTITY')).toBe(true);
      expect(manager.isImmutableSection('SAFETY')).toBe(true);
      expect(manager.isModifiableSection('OPERATIONAL RULES')).toBe(true);
    });
  });

  describe('Change Validation', () => {
    const originalPrompt = `
### IDENTITY & PERSONA
Tu es un assistant intelligent et proactif.

### CORE OPERATIONAL RULES
1. Tu doit toujours répondre en français
2. CONCISION ABSOLUE : Maximum 35-45 mots par réponse.

### SAFETY & PRIVACY
Respecte la confidentialité.

### RESPONSE FORMAT
Sortie = Texte parlé pur.
    `.trim();

    it('should reject changes to immutable sections', () => {
      const modifiedPrompt = originalPrompt.replace(
        'Tu es un assistant intelligent',
        'Tu es un robot basique'
      );

      const result = manager.validateChange(
        'IDENTITY & PERSONA',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('immutable section'))).toBe(true);
    });

    it('should accept changes to modifiable sections', () => {
      const modifiedPrompt = originalPrompt.replace(
        'Maximum 35-45 mots',
        'Maximum 40-50 mots'
      );

      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject prompts that are too short', () => {
      const modifiedPrompt = '### CORE OPERATIONAL RULES\nShort prompt.';

      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('too short'))).toBe(true);
    });

    it('should reject prompts that are too long', () => {
      const modifiedPrompt = originalPrompt + '\n' + 'x'.repeat(originalPrompt.length);

      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
    });

    it('should reject removal of immutable sections', () => {
      const modifiedPrompt = originalPrompt.replace(
        /### SAFETY & PRIVACY[\s\S]*?(?=###|$)/,
        ''
      );

      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('SAFETY & PRIVACY') && e.includes('removed'))).toBe(true);
    });

    it('should reject removal of core personality traits', () => {
      const modifiedPrompt = originalPrompt.replace('proactif', 'passif');

      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        originalPrompt,
        modifiedPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('proactif') && e.includes('removed'))).toBe(true);
    });

    it('should reject changes to unlisted sections', () => {
      const result = manager.validateChange(
        'UNKNOWN SECTION',
        originalPrompt,
        originalPrompt
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not in the list of modifiable sections'))).toBe(true);
    });
  });

  describe('Section Extraction', () => {
    const testPrompt = `
### IDENTITY & PERSONA
Tu es un assistant intelligent.

### CORE OPERATIONAL RULES
1. Règle 1
2. Règle 2

### SAFETY & PRIVACY
Respecte la confidentialité.
    `.trim();

    it('should extract section content', () => {
      const content = manager.extractSection(testPrompt, 'IDENTITY & PERSONA');
      expect(content).toBe('Tu es un assistant intelligent.');
    });

    it('should extract multi-line section content', () => {
      const content = manager.extractSection(testPrompt, 'CORE OPERATIONAL RULES');
      expect(content).toContain('Règle 1');
      expect(content).toContain('Règle 2');
    });

    it('should return null for non-existent sections', () => {
      const content = manager.extractSection(testPrompt, 'NON EXISTENT');
      expect(content).toBeNull();
    });

    it('should handle case-insensitive section names', () => {
      const content = manager.extractSection(testPrompt, 'identity & persona');
      expect(content).toBe('Tu es un assistant intelligent.');
    });
  });

  describe('Section Analysis', () => {
    const testPrompt = `
### IDENTITY & PERSONA
Content 1

### CORE OPERATIONAL RULES
Content 2

### SAFETY & PRIVACY
Content 3
    `.trim();

    it('should get all section names', () => {
      const sections = manager.getSectionNames(testPrompt);
      expect(sections).toHaveLength(3);
      expect(sections).toContain('IDENTITY & PERSONA');
      expect(sections).toContain('CORE OPERATIONAL RULES');
      expect(sections).toContain('SAFETY & PRIVACY');
    });

    it('should count immutable sections', () => {
      const count = manager.countImmutableSections(testPrompt);
      expect(count).toBe(2); // IDENTITY & PERSONA, SAFETY & PRIVACY
    });

    it('should return 0 for prompt with no immutable sections', () => {
      const minimalPrompt = '### CORE OPERATIONAL RULES\nContent';
      const count = manager.countImmutableSections(minimalPrompt);
      expect(count).toBe(0);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events', () => {
      manager.logSecurityEvent('modification_attempt', {
        targetSection: 'IDENTITY & PERSONA',
        reason: 'Attempted to modify immutable section',
        timestamp: Date.now(),
        proposalId: 'proposal-123',
      });

      const events = manager.getSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('modification_attempt');
      expect(events[0].targetSection).toBe('IDENTITY & PERSONA');
      expect(events[0].proposalId).toBe('proposal-123');
    });

    it('should log validation rejections', () => {
      manager.logSecurityEvent('validation_rejection', {
        targetSection: 'SAFETY & PRIVACY',
        reason: 'Violates safety constraints',
        timestamp: Date.now(),
      });

      const events = manager.getSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('validation_rejection');
    });

    it('should limit stored events to 100', () => {
      // Add 150 events
      for (let i = 0; i < 150; i++) {
        manager.logSecurityEvent('modification_attempt', {
          targetSection: 'TEST',
          reason: `Event ${i}`,
          timestamp: Date.now(),
        });
      }

      const eventsKey = 'neurochat_security_events';
      const stored = localStorage.getItem(eventsKey);
      const events = JSON.parse(stored!);
      
      expect(events).toHaveLength(100);
      // Should keep the most recent ones
      expect(events[0].reason).toBe('Event 50');
      expect(events[99].reason).toBe('Event 149');
    });

    it('should retrieve limited number of events', () => {
      // Add 30 events
      for (let i = 0; i < 30; i++) {
        manager.logSecurityEvent('modification_attempt', {
          targetSection: 'TEST',
          reason: `Event ${i}`,
          timestamp: Date.now(),
        });
      }

      const events = manager.getSecurityEvents(10);
      expect(events).toHaveLength(10);
      // Should get the most recent 10
      expect(events[0].reason).toBe('Event 20');
      expect(events[9].reason).toBe('Event 29');
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_SAFETY_CONSTRAINTS);
    });

    it('should update configuration', () => {
      manager.updateConfig({
        maxLengthMultiplier: 2.0,
        minLengthMultiplier: 0.5,
      });

      const config = manager.getConfig();
      expect(config.maxLengthMultiplier).toBe(2.0);
      expect(config.minLengthMultiplier).toBe(0.5);
      // Other values should remain unchanged
      expect(config.immutableSections).toEqual(DEFAULT_SAFETY_CONSTRAINTS.immutableSections);
    });

    it('should allow custom configuration in constructor', () => {
      const customManager = new SafetyConstraintManager({
        immutableSections: ['CUSTOM SECTION'],
        modifiableSections: ['OTHER SECTION'],
        maxLengthMultiplier: 2.0,
        minLengthMultiplier: 0.5,
        corePersonalityTraits: ['custom', 'traits'],
      });

      expect(customManager.isImmutableSection('CUSTOM SECTION')).toBe(true);
      expect(customManager.isModifiableSection('OTHER SECTION')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompts', () => {
      const result = manager.validateChange(
        'CORE OPERATIONAL RULES',
        '',
        ''
      );

      // Empty prompts pass length validation (0 * 0.8 <= 0 <= 0 * 1.5)
      // but should fail section validation
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not in the list of modifiable sections'))).toBe(true);
    });

    it('should handle prompts without section markers', () => {
      const plainPrompt = 'This is a plain prompt without sections.';
      const sections = manager.getSectionNames(plainPrompt);
      expect(sections).toHaveLength(0);
    });

    it('should handle malformed section headers', () => {
      const malformedPrompt = '## WRONG HEADER\nContent\n### CORRECT HEADER\nMore content';
      const sections = manager.getSectionNames(malformedPrompt);
      expect(sections).toHaveLength(1);
      expect(sections[0]).toBe('CORRECT HEADER');
    });
  });
});

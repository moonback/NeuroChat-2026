/**
 * Safety constraint configuration for the self-improving system prompt.
 * Defines immutable sections and validation rules to ensure safety and consistency.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { SafetyConstraintConfig } from './types';
import { DEFAULT_SAFETY_CONSTRAINTS } from './types';
import { SecurityLogger, defaultSecurityLogger, type SecurityEvent } from './securityLogger';

/**
 * Safety constraint manager.
 * Validates that prompt modifications respect safety boundaries.
 */
export class SafetyConstraintManager {
  private config: SafetyConstraintConfig;

  constructor(
    config: SafetyConstraintConfig = DEFAULT_SAFETY_CONSTRAINTS,
    private readonly securityLogger: SecurityLogger = defaultSecurityLogger,
  ) {
    this.config = config;
  }

  /**
   * Check if a prompt section is immutable (cannot be modified).
   */
  isImmutableSection(sectionName: string): boolean {
    return this.config.immutableSections.some(
      immutable => sectionName.includes(immutable) || immutable.includes(sectionName)
    );
  }

  /**
   * Check if a prompt section is modifiable.
   */
  isModifiableSection(sectionName: string): boolean {
    return this.config.modifiableSections.some(
      modifiable => sectionName.includes(modifiable) || modifiable.includes(sectionName)
    );
  }

  /**
   * Validate that a proposed change doesn't violate safety constraints.
   */
  validateChange(
    targetSection: string,
    originalPrompt: string,
    modifiedPrompt: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Empty or malformed prompts cannot be safely section-validated.
    if (this.getSectionNames(originalPrompt).length === 0 || this.getSectionNames(modifiedPrompt).length === 0) {
      errors.push(
        `Section "${targetSection}" is not in the list of modifiable sections because the prompt contains no valid section markers.`
      );
    }

    // Check if target section is immutable
    if (this.isImmutableSection(targetSection)) {
      errors.push(
        `Cannot modify immutable section: ${targetSection}. This section is protected for safety and consistency.`
      );
    }

    // Check if target section is in the modifiable list
    if (!this.isModifiableSection(targetSection) && !this.isImmutableSection(targetSection)) {
      errors.push(
        `Section "${targetSection}" is not in the list of modifiable sections. Only these sections can be modified: ${this.config.modifiableSections.join(', ')}`
      );
    }

    // Check prompt length constraints
    const originalLength = originalPrompt.length;
    const modifiedLength = modifiedPrompt.length;
    const minLength = originalLength * this.config.minLengthMultiplier;
    const maxLength = originalLength * this.config.maxLengthMultiplier;

    if (modifiedLength < minLength) {
      errors.push(
        `Modified prompt is too short (${modifiedLength} chars). Minimum allowed: ${Math.floor(minLength)} chars (${this.config.minLengthMultiplier}x original).`
      );
    }

    if (modifiedLength > maxLength) {
      errors.push(
        `Modified prompt is too long (${modifiedLength} chars). Maximum allowed: ${Math.floor(maxLength)} chars (${this.config.maxLengthMultiplier}x original).`
      );
    }

    // Check that immutable sections are preserved
    for (const immutableSection of this.config.immutableSections) {
      const sectionPattern = new RegExp(`###\\s*${immutableSection}`, 'i');
      const originalHasSection = sectionPattern.test(originalPrompt);
      const modifiedHasSection = sectionPattern.test(modifiedPrompt);

      if (originalHasSection && !modifiedHasSection) {
        errors.push(
          `Immutable section "${immutableSection}" was removed from the prompt. This section must be preserved.`
        );
      }
    }

    // Check that core personality traits are preserved
    for (const trait of this.config.corePersonalityTraits) {
      const traitPattern = new RegExp(trait, 'i');
      const originalHasTrait = traitPattern.test(originalPrompt);
      const modifiedHasTrait = traitPattern.test(modifiedPrompt);

      if (originalHasTrait && !modifiedHasTrait) {
        errors.push(
          `Core personality trait "${trait}" was removed from the prompt. Core traits must be preserved for consistency.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract section content from a prompt.
   */
  extractSection(prompt: string, sectionName: string): string | null {
    const sectionPattern = new RegExp(
      `###\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`,
      'i'
    );
    const match = prompt.match(sectionPattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Get all section names from a prompt.
   */
  getSectionNames(prompt: string): string[] {
    const sectionPattern = /###\s*([^\n]+)/g;
    const sections: string[] = [];
    let match;

    while ((match = sectionPattern.exec(prompt)) !== null) {
      sections.push(match[1].trim());
    }

    return sections;
  }

  /**
   * Count the number of immutable sections in a prompt.
   */
  countImmutableSections(prompt: string): number {
    let count = 0;
    for (const immutableSection of this.config.immutableSections) {
      const sectionPattern = new RegExp(`###\\s*${immutableSection}`, 'i');
      if (sectionPattern.test(prompt)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Log a security event (attempt to modify safety constraints).
   */
  async logSecurityEvent(
    eventType: 'modification_attempt' | 'validation_rejection',
    details: {
      targetSection: string;
      reason: string;
      timestamp: number;
      proposalId?: string;
    }
  ): Promise<void> {
    if (eventType === 'modification_attempt') {
      await this.securityLogger.logModificationAttempt(details.targetSection, details.reason, details);
      return;
    }

    await this.securityLogger.logValidationRejection(details.reason, details);
  }

  /**
   * Get recent security events.
   */
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityLogger.getEvents(limit);
  }

  /**
   * Get the current safety configuration.
   */
  getConfig(): SafetyConstraintConfig {
    return { ...this.config };
  }

  /**
   * Update the safety configuration.
   * Note: This should be used with caution and typically only during initialization.
   */
  updateConfig(updates: Partial<SafetyConstraintConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Default safety constraint manager instance.
 */
export const defaultSafetyManager = new SafetyConstraintManager();

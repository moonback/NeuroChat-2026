import type { ImprovementProposal, PerformanceMetrics, PromptVersion, PromptVersionHistory } from './types';
import { logAutoImprovement } from './autoImprovementLog';
import { getLearningStorage } from './storage';

const MAX_VERSIONS = 20;

export class PromptVersionManager {
  constructor(private readonly userId: string) {}

  async getHistory(): Promise<PromptVersionHistory> {
    const data = await getLearningStorage(this.userId).load();
    return data.versionHistory;
  }

  async createVersion(input: {
    promptText: string;
    changeDescription: string;
    appliedProposals: (string | ImprovementProposal)[];
    performanceMetrics?: PerformanceMetrics;
  }): Promise<PromptVersion> {
    const storage = getLearningStorage(this.userId);
    const data = await storage.load();
    const history = data.versionHistory;

    const nextVersion = (history.versions[history.versions.length - 1]?.version ?? 0) + 1;

    const version: PromptVersion = {
      version: nextVersion,
      promptText: input.promptText,
      timestamp: Date.now(),
      changeDescription: input.changeDescription,
      appliedProposals: input.appliedProposals,
      performanceMetrics: input.performanceMetrics,
      isActive: true,
    };

    const updatedVersions = history.versions.map((v) => ({ ...v, isActive: false })).concat(version).slice(-MAX_VERSIONS);
    const activeVersion = updatedVersions[updatedVersions.length - 1]?.version ?? 0;

    const updatedHistory: PromptVersionHistory = {
      ...history,
      versions: updatedVersions,
      activeVersion,
      userId: this.userId,
      lastUpdated: Date.now(),
    };

    await storage.updateVersionHistory(updatedHistory);
    logAutoImprovement("Versions", "Nouvelle version de prompt créée", {
      userId: this.userId,
      version: version.version,
      activeVersion,
      changeDescription: input.changeDescription,
      appliedProposals: input.appliedProposals,
      promptLength: input.promptText.length,
      hasMetrics: Boolean(input.performanceMetrics),
    });
    return version;
  }

  async rollback(targetVersion: number): Promise<PromptVersion | null> {
    const storage = getLearningStorage(this.userId);
    const data = await storage.load();
    const history = data.versionHistory;

    const target = history.versions.find((v) => v.version === targetVersion);
    if (!target) {
      logAutoImprovement("Versions", "Rollback échoué — version introuvable", {
        userId: this.userId,
        targetVersion,
        knownVersions: history.versions.map((v) => v.version),
      });
      return null;
    }

    const updatedHistory: PromptVersionHistory = {
      ...history,
      versions: history.versions.map((v) => ({ ...v, isActive: v.version === targetVersion })),
      activeVersion: targetVersion,
      lastUpdated: Date.now(),
    };

    await storage.updateVersionHistory(updatedHistory);
    logAutoImprovement("Versions", "Rollback prompt", {
      userId: this.userId,
      targetVersion,
      success: Boolean(target),
    });
    return { ...target, isActive: true };
  }
}

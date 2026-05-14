import { describe, expect, it, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';

const USER_ID = 'version-user';

describe('PromptVersionManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and stores versions', async () => {
    const manager = new PromptVersionManager(USER_ID);
    const v1 = await manager.createVersion({ promptText: 'Prompt 1', changeDescription: 'initial', appliedProposals: [] });
    const v2 = await manager.createVersion({ promptText: 'Prompt 2', changeDescription: 'update', appliedProposals: ['p1'] });

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);

    const history = await manager.getHistory();
    expect(history.versions).toHaveLength(2);
    expect(history.activeVersion).toBe(2);
  });

  it('rolls back to previous version', async () => {
    const manager = new PromptVersionManager(USER_ID);
    await manager.createVersion({ promptText: 'Prompt A', changeDescription: 'A', appliedProposals: [] });
    await manager.createVersion({ promptText: 'Prompt B', changeDescription: 'B', appliedProposals: ['p2'] });

    const rolled = await manager.rollback(1);
    expect(rolled?.version).toBe(1);
    expect(rolled?.isActive).toBe(true);

    const history = await manager.getHistory();
    expect(history.activeVersion).toBe(1);
    expect(history.versions.find(v => v.version === 1)?.isActive).toBe(true);
    expect(history.versions.find(v => v.version === 2)?.isActive).toBe(false);
  });

  it('property: version count never exceeds 20', { timeout: 15000 }, async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 21, max: 30 }), async (count) => {
      localStorage.clear();
      const manager = new PromptVersionManager(USER_ID);
      for (let i = 0; i < count; i++) {
        await manager.createVersion({
          promptText: `Prompt ${i}`,
          changeDescription: `Change ${i}`,
          appliedProposals: [],
        });
      }
      const history = await manager.getHistory();
      expect(history.versions.length).toBeLessThanOrEqual(20);
    }));
  });

  it('property: rollback returns exact stored prompt', async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }), async (prompts) => {
      localStorage.clear();
      const manager = new PromptVersionManager(USER_ID);
      for (const [idx, prompt] of prompts.entries()) {
        await manager.createVersion({ promptText: prompt, changeDescription: `v${idx}`, appliedProposals: [] });
      }
      const targetVersion = Math.floor(prompts.length / 2) + 1;
      const rolled = await manager.rollback(targetVersion);
      expect(rolled?.promptText).toBe(prompts[targetVersion - 1]);
    }));
  });
});

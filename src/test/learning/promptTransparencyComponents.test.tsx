import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptVersionDisplay } from '../../components/learning/PromptVersionDisplay';
import { PromptControlPanel } from '../../components/learning/PromptControlPanel';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import { defaultSecurityLogger } from '../../lib/learning/securityLogger';

describe('prompt transparency components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders prompt version history and security events', async () => {
    const manager = new PromptVersionManager('ui-user');
    await manager.createVersion({ promptText: 'Prompt 1', changeDescription: 'Initial prompt', appliedProposals: [] });
    await manager.createVersion({
      promptText: 'Prompt 2',
      changeDescription: 'Improved prompt',
      appliedProposals: ['p1'],
      performanceMetrics: {
        concisionRatio: 1,
        contextAwareness: 80,
        proactivity: 60,
        userSatisfaction: 90,
        compositeQualityScore: 84,
        turnCount: 12,
        periodStart: 1,
        periodEnd: 2,
        individualMetrics: [],
      },
    });
    defaultSecurityLogger.logValidationRejection('Blocked immutable change', { targetSection: 'SAFETY & PRIVACY' });

    render(<PromptVersionDisplay userId="ui-user" accentColor="#8B5CF6" />);

    await waitFor(() => expect(screen.getAllByText('v2').length).toBeGreaterThan(0));
    expect(screen.getByText('Improved prompt')).toBeInTheDocument();
    expect(screen.getByText('Blocked immutable change')).toBeInTheDocument();
    expect(screen.getByText('Score qualité: 84/100 · 12 tour(s)')).toBeInTheDocument();
  });

  it('toggles automatic improvements in the control panel', async () => {
    const onChanged = vi.fn();
    render(<PromptControlPanel userId="control-user" accentColor="#8B5CF6" onChanged={onChanged} />);

    await waitFor(() => expect(screen.getByText('Activées')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Améliorations automatiques'));

    await waitFor(() => expect(screen.getByText('Désactivées')).toBeInTheDocument());
    expect(onChanged).toHaveBeenCalled();
  });

  it('rolls back to a previous version from the control panel', async () => {
    const manager = new PromptVersionManager('rollback-ui-user');
    await manager.createVersion({ promptText: 'Prompt v1', changeDescription: 'Initial prompt', appliedProposals: [] });
    await manager.createVersion({ promptText: 'Prompt v2', changeDescription: 'Improved prompt', appliedProposals: ['p1'] });

    render(<PromptControlPanel userId="rollback-ui-user" accentColor="#8B5CF6" />);

    await waitFor(() => expect(screen.getByText('Restaurer v1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Restaurer v1'));

    await waitFor(() => expect(screen.getByText('Retour à la version v1.')).toBeInTheDocument());
    const history = await manager.getHistory();
    expect(history.activeVersion).toBe(1);
  });
});

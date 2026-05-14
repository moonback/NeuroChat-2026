import { useEffect, useState } from 'react';
import { RotateCcw, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { getLearningStorage } from '../../lib/learning/storage';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import { runLearningCycleForUser } from '../../lib/learning/learningCycleRunner';
import { logAutoImprovement } from '../../lib/learning/autoImprovementLog';
import type { LearningCycleConfig, PromptVersion } from '../../lib/learning/types';

interface PromptControlPanelProps {
  userId: string;
  accentColor: string;
  onChanged?: () => void;
  onManualCycle?: () => void | Promise<void>;
}

export function PromptControlPanel({ userId, accentColor, onChanged, onManualCycle }: PromptControlPanelProps) {
  const [config, setConfig] = useState<LearningCycleConfig | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [message, setMessage] = useState<string>('');

  async function refresh() {
    const storage = getLearningStorage(userId);
    const data = await storage.load();
    const history = await new PromptVersionManager(userId).getHistory();
    setConfig(data.config);
    setVersions(history.versions);
  }

  useEffect(() => {
    void refresh();
  }, [userId]);

  const toggleEnabled = async () => {
    if (!config) return;
    const nextEnabled = !config.enabled;
    logAutoImprovement("UI", "Bascule apprentissage automatique", { userId, nextEnabled });
    await getLearningStorage(userId).updateConfig({ enabled: nextEnabled });
    setConfig({ ...config, enabled: nextEnabled });
    setMessage(nextEnabled ? 'Améliorations automatiques activées.' : 'Améliorations automatiques désactivées.');
    onChanged?.();
  };

  const triggerManualCycle = async () => {
    logAutoImprovement("UI", "Cycle manuel demandé", { userId });
    const status = await runLearningCycleForUser(userId, { manual: true });
    logAutoImprovement("UI", "Cycle manuel terminé", {
      userId,
      success: status.success,
      phase: status.phase,
      proposalsApplied: status.proposalsApplied,
      errors: status.errors,
    });
    await onManualCycle?.();
    await refresh();
    setMessage(status.success ? `Cycle manuel terminé: ${status.proposalsApplied} amélioration(s).` : status.errors[0] ?? 'Cycle manuel échoué.');
    onChanged?.();
  };

  const rollback = async (version: number) => {
    logAutoImprovement("UI", "Rollback demandé depuis le panneau", { userId, version });
    const restored = await new PromptVersionManager(userId).rollback(version);
    logAutoImprovement("UI", "Rollback exécuté", { userId, version, ok: Boolean(restored) });
    setMessage(restored ? `Retour à la version v${version}.` : `Version v${version} introuvable.`);
    await refresh();
    onChanged?.();
  };

  const activeVersion = versions.find((version) => version.isActive)?.version ?? 0;
  const rollbackTargets = versions.filter((version) => version.version !== activeVersion).slice(-5).reverse();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4" data-testid="prompt-control-panel">
      <div>
        <h3 className="text-sm font-bold text-white">Contrôles d’apprentissage</h3>
        <p className="text-xs text-slate-500 mt-1">Gérez les améliorations automatiques et les retours arrière.</p>
      </div>

      <button
        onClick={toggleEnabled}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/50 text-left"
      >
        <span>
          <span className="block text-sm text-white">Améliorations automatiques</span>
          <span className="block text-xs text-slate-500">{config?.enabled ? 'Activées' : 'Désactivées'}</span>
        </span>
        {config?.enabled ? <ToggleRight className="w-6 h-6" style={{ color: accentColor }} /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
      </button>

      <button
        onClick={triggerManualCycle}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm"
        style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
      >
        <Sparkles className="w-4 h-4" />
        Lancer un cycle manuel
      </button>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rollback</p>
        {rollbackTargets.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune version précédente disponible.</p>
        ) : (
          rollbackTargets.map((version) => (
            <button
              key={version.version}
              onClick={() => rollback(version.version)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/50 text-left"
            >
              <span className="text-sm text-slate-200">Restaurer v{version.version}</span>
              <RotateCcw className="w-4 h-4 text-slate-500" />
            </button>
          ))
        )}
      </div>

      {message && <p className="text-xs text-slate-400">{message}</p>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Clock, GitBranch, ShieldAlert } from 'lucide-react';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import { defaultSecurityLogger, type SecurityEvent } from '../../lib/learning/securityLogger';
import type { PromptVersionHistory } from '../../lib/learning/types';

interface PromptVersionDisplayProps {
  userId: string;
  accentColor: string;
  refreshKey?: number;
}

export function PromptVersionDisplay({ userId, accentColor, refreshKey = 0 }: PromptVersionDisplayProps) {
  const [history, setHistory] = useState<PromptVersionHistory | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const loaded = await new PromptVersionManager(userId).getHistory();
      if (!cancelled) {
        setHistory(loaded);
        setEvents(defaultSecurityLogger.getEvents(5));
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const versions = history?.versions ?? [];
  const activeVersion = versions.find((version) => version.version === history?.activeVersion);

  return (
    <div className="space-y-4" data-testid="prompt-version-display">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-white">Version du prompt</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Active</p>
            <p className="text-2xl font-bold text-white">v{history?.activeVersion ?? 0}</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Historique</p>
            <p className="text-2xl font-bold text-white">{versions.length}</p>
          </div>
        </div>
        {activeVersion ? (
          <p className="mt-3 text-xs text-slate-400">
            Dernière mise à jour: {new Date(activeVersion.timestamp).toLocaleString('fr-FR')} · {activeVersion.changeDescription}
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500 italic">Aucune version auto-améliorée enregistrée.</p>
        )}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-white">Historique des versions</h3>
        </div>
        {versions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Les versions apparaîtront après un cycle d’apprentissage.</p>
        ) : (
          <div className="space-y-2">
            {[...versions].reverse().map((version) => (
              <div key={version.version} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-white">v{version.version}</span>
                  {version.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: accentColor, background: `${accentColor}18` }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{version.changeDescription}</p>
                <p className="mt-1 text-[10px] text-slate-600">{version.appliedProposals.length} amélioration(s) · {new Date(version.timestamp).toLocaleString('fr-FR')}</p>
                {version.performanceMetrics && (
                  <p className="mt-1 text-[10px] text-slate-500">Score qualité: {Math.round(version.performanceMetrics.compositeQualityScore)}/100 · {version.performanceMetrics.turnCount} tour(s)</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Événements sécurité</h3>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun événement sécurité récent.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold text-amber-200">{event.type}</p>
                <p className="text-xs text-slate-400">{event.reason ?? event.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

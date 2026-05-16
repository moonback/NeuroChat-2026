import { useEffect, useState } from 'react';
import { Activity, Clock, GitBranch, ShieldAlert, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PromptVersionManager } from '../../lib/learning/promptVersionManager';
import { getLearningStorage } from '../../lib/learning/storage';
import { defaultSecurityLogger, type SecurityEvent } from '../../lib/learning/securityLogger';
import type { LearningCycleStatus, PromptVersionHistory } from '../../lib/learning/types';

interface PromptVersionDisplayProps {
  userId: string;
  accentColor: string;
  refreshKey?: number;
}

export function PromptVersionDisplay({ userId, accentColor, refreshKey = 0 }: PromptVersionDisplayProps) {
  const [history, setHistory] = useState<PromptVersionHistory | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [cycles, setCycles] = useState<LearningCycleStatus[]>([]);
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);

  const togglePrompt = (version: number) => {
    setExpandedPrompt(prev => prev === version ? null : version);
  };


  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const [loaded, learningData] = await Promise.all([
        new PromptVersionManager(userId).getHistory(),
        getLearningStorage(userId).load(),
      ]);
      if (!cancelled) {
        setHistory(loaded);
        setCycles(learningData.cycleHistory.slice(-5).reverse());
        const securityEvents = await defaultSecurityLogger.getEvents(5);
        setEvents(securityEvents);
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
          <div className="space-y-4">
            {[...versions].reverse().map((version) => (
              <div key={version.version} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: version.isActive ? accentColor : 'transparent' }}></div>
                
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">v{version.version}</span>
                    <span className="text-[10px] text-slate-500">{new Date(version.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                  {version.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold tracking-wider" style={{ color: accentColor, background: `${accentColor}18` }}>
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-slate-300 font-medium mb-3">{version.changeDescription}</p>
                
                {/* Performance Metrics Dashboard */}
                {version.performanceMetrics && (
                  <div className="mb-4 bg-slate-900/50 rounded-xl p-3 border border-slate-800/50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                      <span>Métriques de Performance</span>
                      <span style={{ color: accentColor }}>Score global: {Math.round(version.performanceMetrics.compositeQualityScore)}/100</span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <MetricBar label="Satisfaction" value={version.performanceMetrics.userSatisfaction} color="bg-green-500" />
                      <MetricBar label="Proactivité" value={version.performanceMetrics.proactivity} color="bg-blue-500" />
                      <MetricBar label="Contexte" value={version.performanceMetrics.contextAwareness} color="bg-purple-500" />
                      <MetricBar label="Concision" value={version.performanceMetrics.concisionRatio * 100} color="bg-amber-500" />
                    </div>
                  </div>
                )}
                
                {/* Detailed improvements list */}
                {version.appliedProposals && version.appliedProposals.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-800/50 pt-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Améliorations appliquées ({version.appliedProposals.length}) :</p>
                    {version.appliedProposals.map((prop: any, i) => {
                      if (typeof prop === 'string') {
                        return <span key={i} className="inline-block bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-md mr-1 mb-1 font-mono">ID: {prop}</span>;
                      }
                      return (
                        <div key={i} className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-800/30">
                          <p className="text-xs text-slate-200 font-medium leading-relaxed">✨ {prop.proposedChange}</p>
                          <p className="text-[11px] text-slate-500 mt-1 italic">Raison: {prop.justification}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Collapsible Prompt Text */}
                <div className="mt-3 border-t border-slate-800/50 pt-2">
                  <button 
                    onClick={() => togglePrompt(version.version)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    {expandedPrompt === version.version ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {expandedPrompt === version.version ? "Masquer le Prompt" : "Voir le Prompt Complet"}
                  </button>
                  {expandedPrompt === version.version && (
                    <pre className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {version.promptText}
                    </pre>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>


      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-white">Cycles d’apprentissage</h3>
        </div>
        {cycles.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucun cycle d’apprentissage enregistré.</p>
        ) : (
          <div className="space-y-2">
            {cycles.map((cycle) => (
              <div key={cycle.cycleId} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-200">{cycle.phase}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${cycle.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                    {cycle.success ? 'SUCCÈS' : 'ÉCHEC'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {cycle.proposalsGenerated} générée(s) · {cycle.proposalsValidated} validée(s) · {cycle.proposalsApplied} appliquée(s)
                </p>
                {cycle.errors.length > 0 && (
                  <p className="mt-1 text-[10px] text-red-300">{cycle.errors[0]}</p>
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

// Helper component for metric bars
function MetricBar({ label, value, color }: { label: string, value: number, color: string }) {
  const boundedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
        <span className="text-[10px] font-bold text-slate-300">{Math.round(boundedValue)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${boundedValue}%` }}></div>
      </div>
    </div>
  );
}


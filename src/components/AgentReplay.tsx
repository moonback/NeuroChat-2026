import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  History, 
  Terminal, 
  ChevronRight, 
  Activity, 
  Globe, 
  Folder, 
  Bot, 
  Search,
  ArrowRight,
  Database,
  Cpu
} from 'lucide-react';

interface TraceEvent {
  type: string;
  iteration: number;
  [key: string]: any;
}

interface AgentTrace {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  events: TraceEvent[];
}

export function AgentReplay({ accentColor }: { accentColor: string }) {
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<AgentTrace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTraces = async () => {
      try {
        // @ts-ignore
        const data = await window.neurochatElectron.db.loadTraces();
        setTraces(data);
      } catch (err) {
        console.error('Failed to load traces:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTraces();
  }, []);

  const getAgentIcon = (agentId?: string) => {
    switch (agentId) {
      case "supervisor": return <Activity className="w-4 h-4 text-purple-400" />;
      case "research_agent": return <Globe className="w-4 h-4 text-blue-400" />;
      case "file_agent": return <Folder className="w-4 h-4 text-emerald-400" />;
      default: return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar: Trace List */}
      <div className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <History className="w-3.5 h-3.5" />
            Historique des Traces
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {traces.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-sm italic">
              Aucune trace disponible
            </div>
          ) : (
            traces.map((trace) => (
              <button
                key={trace.id}
                onClick={() => setSelectedTrace(trace)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  selectedTrace?.id === trace.id
                    ? 'bg-slate-800 border-slate-700 shadow-lg'
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className="text-xs text-slate-500 mb-1">
                  {new Date(trace.timestamp).toLocaleString('fr-FR')}
                </div>
                <div className="text-sm font-medium text-slate-200 truncate">
                  Task: {trace.events[0]?.input || 'Tâche inconnue'}
                </div>
                <div className="mt-2 flex items-center gap-2">
                   <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500">
                     {trace.events.length} events
                   </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Trace Detail */}
      <div className="flex-1 flex flex-col bg-slate-950/30 overflow-hidden">
        {selectedTrace ? (
          <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Détails de la Trace Agent</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: {selectedTrace.id}</p>
              </div>
              <button 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                onClick={() => console.log('Replay logic here')}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Rejouer
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {selectedTrace.events.map((ev, i) => {
                  let content = null;
                  
                  if (ev.type === "agent_start") {
                    content = (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                         <div className="text-xs font-bold text-blue-400 uppercase mb-2">Entrée Utilisateur</div>
                         <div className="text-slate-200 italic">"{ev.input}"</div>
                      </div>
                    );
                  } else if (ev.type === "model_response") {
                    try {
                      const parsed = JSON.parse(ev.raw);
                      content = (
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                             <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                             Réflexion de l'Agent
                           </div>
                           <div className="text-sm text-slate-300 leading-relaxed font-serif italic">
                             {parsed.thought}
                           </div>
                           {parsed.toolCall && (
                             <div className="pt-2 border-t border-slate-800/50 flex items-center gap-3">
                                <Terminal className="w-4 h-4 text-emerald-400" />
                                <div className="text-xs font-mono text-emerald-400/80">
                                  EXEC: {parsed.toolCall.name}({JSON.stringify(parsed.toolCall.arguments)})
                                </div>
                             </div>
                           )}
                        </div>
                      );
                    } catch {
                      content = <div className="text-xs text-slate-500 font-mono p-4 bg-slate-900 rounded-2xl">{ev.raw}</div>;
                    }
                  } else if (ev.type === "tool_result") {
                    content = (
                      <div className="ml-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-500/70 uppercase">
                          <Database className="w-3.5 h-3.5" />
                          Résultat de l'Outil: {ev.result.skill}
                        </div>
                        <div className="text-xs font-mono text-slate-400 max-h-32 overflow-hidden text-ellipsis">
                          {JSON.stringify(ev.result.data, null, 2)}
                        </div>
                      </div>
                    );
                  } else if (ev.type === "completed") {
                    content = (
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                         <div className="text-xs font-bold text-amber-400 uppercase">Réponse Finale</div>
                         <div className="text-slate-200 text-sm leading-relaxed">{ev.answer}</div>
                      </div>
                    );
                  }

                  if (!content) return null;

                  return (
                    <div key={i} className="relative pl-8">
                       {/* Timeline Line */}
                       <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-800" />
                       {/* Timeline Dot */}
                       <div className="absolute left-1 top-2 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center bg-slate-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                       </div>
                       
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                           {getAgentIcon(ev.agentId)}
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{ev.agentName || 'System'}</span>
                           <span className="text-[10px] text-slate-600">Iter {ev.iteration}</span>
                         </div>
                         {content}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
            <Terminal className="w-16 h-16 text-slate-800 mb-4" />
            <p className="text-slate-600 text-sm">Sélectionnez une trace pour visualiser le raisonnement de l'agent</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * DebugPanel - Panneau de débogage pour le contrôle du navigateur
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bug, X, ChevronDown, ChevronUp, TestTube } from "lucide-react";
import { testCommandPatterns } from "../lib/commandParser";
import { loadAgentTraces } from "../lib/agent/traceStore";
import { loadSkillPolicyConfig, saveSkillPolicyConfig } from "../lib/skills/policyStore";

interface DebugLog {
  timestamp: number;
  level: "info" | "success" | "warning" | "error";
  category: string;
  message: string;
  data?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showAgentTraces, setShowAgentTraces] = useState(false);
  const [traceUserFilter, setTraceUserFilter] = useState("all");
  const [traceSessionFilter, setTraceSessionFilter] = useState("all");
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const pendingLogsRef = useRef<DebugLog[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [policyDraft, setPolicyDraft] = useState(() => JSON.stringify(loadSkillPolicyConfig(), null, 2));

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const captureLog = useCallback((level: "info" | "success" | "warning" | "error", args: any[]) => {
    if (!isMounted.current) return;
    const message = args[0];

    // Never mirror render-spam lines or system/vite errors that cause infinite loops.
    if (typeof message === "string" && (
      /\[BrowserWindow\].*Rendu/i.test(message) || 
      /\[BrowserControlPanel\].*État/i.test(message) ||
      /\[BrowserControl\].*Contrôle/i.test(message) ||
      message.includes("Maximum update depth exceeded") ||
      message.includes("[vite] failed to connect to websocket")
    )) {
      return;
    }

    // Filtrer uniquement les logs liés au contrôle du navigateur
    if (
      typeof message === "string" &&
      (message.includes("[BrowserControl]") ||
        message.includes("[CommandParser]") ||
        message.includes("[BrowserWindow]") ||
        message.includes("[AutoAmélioration]") ||
        (message.includes("[App]") && message.includes("🌐")))
    ) {
      const categoryMatch = message.match(/\[([^\]]+)\]/);
      const category = categoryMatch ? categoryMatch[1] : "Unknown";

      const newLog: DebugLog = {
        timestamp: Date.now(),
        level: message.includes("✅") ? "success" : message.includes("❌") || message.includes("💥") ? "error" : message.includes("⚠️") ? "warning" : level,
        category,
        message: message,
        data: args.length > 1 ? args.slice(1) : undefined,
      };

      pendingLogsRef.current.push(newLog);
    }
  }, []);

  /** Never invoke captureLog synchronously from console.* (can run during another component's render). */
  const deferCapture = useCallback((level: "info" | "success" | "warning" | "error", args: any[]) => {
    // Schedule for next microtask AND next frame to be extremely safe
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (isMounted.current) {
          captureLog(level, args);
        }
      });
    }, 0);
  }, [captureLog]);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      if (isOpen && isExpanded) deferCapture("info", args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      if (isOpen && isExpanded) deferCapture("error", args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      if (isOpen && isExpanded) deferCapture("warning", args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [deferCapture, isOpen, isExpanded]);


  useEffect(() => {
    flushTimerRef.current = window.setInterval(() => {
      if (!isMounted.current || pendingLogsRef.current.length === 0) return;
      const chunk = pendingLogsRef.current.splice(0, pendingLogsRef.current.length);
      setLogs((prev) => [...prev, ...chunk].slice(-200));
    }, 250);

    return () => {
      if (flushTimerRef.current) window.clearInterval(flushTimerRef.current);
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "errors") return log.level === "error";
    if (filter === "success") return log.level === "success";
    return log.category === filter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "success":
        return "bg-green-500/10 border-green-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-blue-500/10 border-blue-500/30";
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full shadow-lg transition-all"
        title="Ouvrir le panneau de débogage"
      >
        <Bug className="w-5 h-5 text-slate-400" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="fixed bottom-6 left-6 z-50 w-[600px] bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Débogage Navigateur</h3>
            <span className="text-xs text-slate-500">({logs.length} logs)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <button
              onClick={() => testCommandPatterns()}
              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors flex items-center gap-1"
              title="Tester les patterns de commandes"
            >
              <TestTube className="w-3 h-3" />
              Test
            </button>
            <button
              onClick={() => setShowAgentTraces((v) => !v)}
              className="text-xs px-2 py-1 bg-violet-700 hover:bg-violet-600 rounded text-white transition-colors"
            >
              {showAgentTraces ? "Masquer traces" : "Traces agent"}
            </button>
            <button
              onClick={() => setShowPolicyEditor((v) => !v)}
              className="text-xs px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-white transition-colors"
            >
              {showPolicyEditor ? "Masquer policy" : "Policy"}
            </button>
            <button
              onClick={() => setLogs([])}
              className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
            >
              Effacer
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {showPolicyEditor && (
              <div className="p-2 border-b border-slate-700 space-y-2">
                <div className="text-xs text-emerald-300">Policy management (roles/scopes/expiry/denylist)</div>
                <textarea className="w-full h-32 bg-slate-950 text-slate-200 text-xs p-2 rounded border border-slate-700" value={policyDraft} onChange={(e) => setPolicyDraft(e.target.value)} />
                <button className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white" onClick={() => { try { saveSkillPolicyConfig(JSON.parse(policyDraft)); } catch (e) { console.error("Policy JSON invalide", e); } }}>Sauvegarder policy</button>
              </div>
            )}
            {showAgentTraces && (() => {
              const traces = loadAgentTraces();
              const users = Array.from(new Set(traces.map((t) => t.userId)));
              const sessions = Array.from(new Set(traces.map((t) => t.sessionId)));
              const filtered = traces
                .filter((t) => traceUserFilter === "all" || t.userId === traceUserFilter)
                .filter((t) => traceSessionFilter === "all" || t.sessionId === traceSessionFilter)
                .slice(-20)
                .sort((a, b) => a.timestamp - b.timestamp);
              const selected = filtered.find((t) => t.id === selectedTraceId) ?? filtered[filtered.length - 1];

              return (
                <div className="p-2 border-b border-slate-700 text-xs text-slate-300 space-y-2">
                  <div className="flex gap-2">
                    <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1" value={traceUserFilter} onChange={(e) => setTraceUserFilter(e.target.value)}>
                      <option value="all">Tous users</option>
                      {users.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <select className="bg-slate-800 border border-slate-600 rounded px-2 py-1" value={traceSessionFilter} onChange={(e) => setTraceSessionFilter(e.target.value)}>
                      <option value="all">Toutes sessions</option>
                      {sessions.map((sid) => <option key={sid} value={sid}>{sid}</option>)}
                    </select>
                  </div>
                  <div className="max-h-24 overflow-auto space-y-1">
                    {filtered.map((t) => (
                      <button key={t.id} onClick={() => setSelectedTraceId(t.id)} className="w-full text-left p-1 rounded hover:bg-slate-800">
                        <div className="text-violet-300">{new Date(t.timestamp).toLocaleTimeString()} · {t.userId} · {t.events.length} events</div>
                        <div className="text-slate-400">session: {t.sessionId}</div>
                      </button>
                    ))}
                  </div>
                  {selected && (
                    <div className="max-h-28 overflow-auto bg-slate-950/70 rounded p-2 border border-slate-700">
                      <div className="text-slate-400 mb-1">Replay chronologique</div>
                      {selected.events.map((ev, idx) => (
                        <pre key={idx} className="text-[10px] text-slate-300 whitespace-pre-wrap">{JSON.stringify(ev, null, 2)}</pre>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Filters */}
            <div className="bg-slate-800/50 border-b border-slate-700 p-2 flex gap-2 overflow-x-auto">
              {["all", "BrowserControl", "CommandParser", "BrowserWindow", "AutoAmélioration", "App", "errors", "success"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      filter === f
                        ? "bg-blue-500 text-white"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {f === "all"
                      ? "Tous"
                      : f === "errors"
                        ? "Erreurs"
                        : f === "success"
                          ? "Succès"
                          : f === "AutoAmélioration"
                            ? "Auto-amél."
                            : f}
                  </button>
                )
              )}
            </div>

            {/* Logs */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Aucun log à afficher
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-lg border text-xs ${getLevelBg(log.level)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-mono text-[10px] mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1">
                        <div className={`font-medium ${getLevelColor(log.level)}`}>
                          {log.message}
                        </div>
                        {log.data && (
                          <pre className="mt-1 text-slate-400 text-[10px] overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

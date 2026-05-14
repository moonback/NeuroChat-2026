/**
 * DebugPanel - Panneau de débogage pour le contrôle du navigateur
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bug, X, ChevronDown, ChevronUp, TestTube } from "lucide-react";
import { testCommandPatterns } from "../lib/commandParser";

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

  const captureLog = useCallback((level: "info" | "success" | "warning" | "error", args: any[]) => {
    const message = args[0];

    // Never mirror render-spam lines: they match [BrowserWindow] and cause setState → re-render loops with console patching.
    if (typeof message === "string" && /\[BrowserWindow\].*Rendu/i.test(message)) {
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

      setLogs((prev) => [...prev.slice(-49), newLog]);
    }
  }, []);

  /** Never invoke captureLog synchronously from console.* (can run during another component's render). */
  const deferCapture = useCallback((level: "info" | "success" | "warning" | "error", args: any[]) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => captureLog(level, args), 0);
      });
    });
  }, [captureLog]);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      deferCapture("info", args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      deferCapture("error", args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      deferCapture("warning", args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [deferCapture]);

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

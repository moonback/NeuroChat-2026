/**
 * BrowserControlPanel - Interface pour le contrôle du navigateur
 */

import { motion, AnimatePresence } from "motion/react";
import { Globe, Check, X, Activity, History, Shield } from "lucide-react";
import type { BrowserAction } from "../lib/browserControl";

interface BrowserControlPanelProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  pendingConfirmation: BrowserAction | null;
  onConfirm: (confirmed: boolean) => void;
  currentAction: BrowserAction | null;
  actionHistory: BrowserAction[];
  accentColor: string;
}

export function BrowserControlPanel({
  isEnabled,
  onToggle,
  pendingConfirmation,
  onConfirm,
  currentAction,
  actionHistory,
  accentColor,
}: BrowserControlPanelProps) {
  console.log("🎛️ [BrowserControlPanel] État:", {
    isEnabled,
    hasPendingConfirmation: !!pendingConfirmation,
    hasCurrentAction: !!currentAction,
    historyLength: actionHistory.length,
  });

  const getActionDescription = (action: BrowserAction): string => {
    switch (action.type) {
      case "navigate":
        return `Naviguer vers ${action.params?.url}`;
      case "click":
        return `Cliquer sur "${action.params?.selector?.text || action.params?.selector?.selector}"`;
      case "type":
        return `Saisir "${action.params?.text}" dans ${action.params?.selector?.placeholder || "un champ"}`;
      case "scroll":
        return `Défiler vers ${action.params?.direction === "up" ? "le haut" : "le bas"}`;
      case "extract":
        return "Lire le contenu de la page";
      case "screenshot":
        return "Prendre une capture d'écran";
      case "back":
        return "Retour en arrière";
      case "forward":
        return "Avancer";
      case "reload":
        return "Recharger la page";
      case "fill_form":
        return "Remplir un formulaire";
      case "submit_form":
        return "Soumettre un formulaire";
      case "wait":
        return `Attendre ${action.params?.duration}ms`;
      default:
        return "Action inconnue";
    }
  };

  const getActionIcon = (type: string): string => {
    const icons: Record<string, string> = {
      navigate: "🌐",
      click: "👆",
      type: "⌨️",
      scroll: "📜",
      extract: "📖",
      screenshot: "📸",
      back: "⬅️",
      forward: "➡️",
      reload: "🔄",
      fill_form: "📝",
      submit_form: "✉️",
      wait: "⏱️",
    };
    return icons[type] || "🔧";
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onToggle(!isEnabled)}
        className={`fixed top-24 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md transition-all ${
          isEnabled
            ? "bg-green-500/20 border border-green-500/50 text-green-400"
            : "bg-slate-800/80 border border-slate-700 text-slate-400"
        }`}
        title={isEnabled ? "Désactiver le contrôle du navigateur" : "Activer le contrôle du navigateur"}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isEnabled ? "Contrôle actif" : "Contrôle inactif"}
        </span>
      </motion.button>

      {/* Current Action Indicator */}
      <AnimatePresence>
        {currentAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-40 right-6 z-40 flex items-center gap-3 px-4 py-3 bg-blue-500/20 border border-blue-500/50 rounded-2xl shadow-lg backdrop-blur-md"
          >
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-blue-300">Action en cours</p>
              <p className="text-xs text-blue-400/80">{getActionDescription(currentAction)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {pendingConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-8 shadow-2xl max-w-md w-full"
              style={{ boxShadow: `0 20px 60px ${accentColor}33` }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <Shield className="w-6 h-6" style={{ color: accentColor }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Confirmation requise
                  </h3>
                  <p className="text-slate-400 text-sm">
                    L'assistant souhaite effectuer l'action suivante :
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getActionIcon(pendingConfirmation.type)}</span>
                  <span className="text-sm font-medium text-slate-300">
                    {pendingConfirmation.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-white font-medium">
                  {getActionDescription(pendingConfirmation)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onConfirm(false)}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Refuser
                </button>
                <button
                  onClick={() => onConfirm(true)}
                  className="flex-1 py-3 px-4 rounded-2xl font-medium transition-all hover:scale-105 flex items-center justify-center gap-2 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                    boxShadow: `0 10px 30px ${accentColor}44`,
                  }}
                >
                  <Check className="w-5 h-5" />
                  Autoriser
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                Cette action nécessite votre autorisation pour des raisons de sécurité
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action History Panel */}
      <AnimatePresence>
        {isEnabled && actionHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-6 right-6 z-40 w-80 max-h-96 bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <h4 className="text-sm font-bold text-white">Historique des actions</h4>
              <span className="ml-auto text-xs text-slate-500">
                {actionHistory.length}
              </span>
            </div>
            <div className="overflow-y-auto max-h-80 p-2">
              {actionHistory.slice().reverse().map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 mb-2 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getActionIcon(action.type)}</span>
                    <span className="text-xs font-medium text-slate-400 uppercase">
                      {action.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {getActionDescription(action)}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

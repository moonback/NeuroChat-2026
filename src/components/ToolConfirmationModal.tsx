import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Check, X, Terminal, ArrowRight } from 'lucide-react';
import { useRuntime } from '../runtime/RuntimeProvider';
import { AVATARS } from '../lib/avatarConfig';

export const ToolConfirmationModal: React.FC = () => {
  const { pendingToolCall, setPendingToolCall, avatarId } = useRuntime();
  const avatar = AVATARS[avatarId];

  if (!pendingToolCall) return null;

  const handleApprove = () => {
    pendingToolCall.resolve(true);
    setPendingToolCall(null);
  };

  const handleDeny = () => {
    pendingToolCall.resolve(false);
    setPendingToolCall(null);
  };

  return (
    <AnimatePresence>
      {pendingToolCall && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-dark rounded-[32px] w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden"
            style={{ boxShadow: `0 20px 50px ${avatar.colors[0]}33` }}
          >
            {/* Header */}
            <div className={`p-6 border-b border-white/5 bg-gradient-to-r ${avatar.accentClass} bg-opacity-10 flex items-center gap-4`}>
              <div className="p-3 rounded-2xl bg-white/10">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Autorisation Requise</h2>
                <p className="text-xs text-white/60 uppercase tracking-widest font-medium">Contrôle de Sécurité NeuroChat</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Terminal className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-slate-300">Action demandée :</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-mono border border-blue-500/20">
                  {pendingToolCall.skillName}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-400">Paramètres de l'action :</p>
                <div className="bg-black/40 rounded-2xl p-4 font-mono text-[11px] text-slate-300 border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(pendingToolCall.arguments, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="p-2 rounded-xl bg-amber-500/10 mt-1">
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-300">Impact potentiel</p>
                  <p className="text-xs text-amber-400/70 leading-relaxed">
                    Cette action peut modifier des fichiers, accéder à votre historique ou interagir avec des services externes.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-white/5 flex gap-4">
              <button
                onClick={handleDeny}
                className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-slate-400 font-bold text-sm hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                REFUSER
              </button>
              <button
                onClick={handleApprove}
                className="flex-[1.5] py-4 px-6 rounded-2xl font-bold text-sm text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{
                  background: `linear-gradient(135deg, ${avatar.colors[0]}, ${avatar.colors[1]})`,
                  boxShadow: `0 10px 20px ${avatar.colors[0]}44`
                }}
              >
                <Check className="w-4 h-4" />
                AUTORISER L'ACTION
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Calendar, MessageSquare, Trash2, X, ChevronRight, History, User } from "lucide-react";
import { ConversationSession } from "../lib/conversationMemory";

interface ConversationVaultProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  memoryData: any;
  selectedSession: ConversationSession | null;
  onSelectSession: (id: string | null) => void;
  onClearMemory: () => void;
  accentColor: string;
}

export function ConversationVault({
  isOpen,
  onClose,
  userName,
  memoryData,
  selectedSession,
  onSelectSession,
  onClearMemory,
  accentColor
}: ConversationVaultProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0F172A] border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
          style={{ boxShadow: `0 0 80px ${accentColor}15` }}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                🧠
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Coffre des Conversations
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    BÊTA PRO
                  </span>
                </h2>
                <p className="text-sm text-slate-500">Exploration de la mémoire de NeuroChat</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar: Session List */}
            <div className={`w-full md:w-80 border-r border-slate-800 overflow-y-auto ${selectedSession ? 'hidden md:block' : 'block'}`}>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between px-2 mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sessions Récentes</span>
                  <button 
                    onClick={onClearMemory}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg group transition-colors"
                    title="Effacer tout"
                  >
                    <Trash2 className="w-4 h-4 text-slate-600 group-hover:text-red-500" />
                  </button>
                </div>

                {!memoryData?.sessions?.length ? (
                  <div className="text-center py-12 px-4">
                    <History className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-20" />
                    <p className="text-slate-600 text-sm italic">Aucune mémoire disponible</p>
                  </div>
                ) : (
                  memoryData.sessions.map((session: ConversationSession) => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border ${
                        selectedSession?.id === session.id 
                        ? 'bg-slate-800/50 border-slate-700 shadow-lg' 
                        : 'bg-transparent border-transparent hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(session.startTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                          {session.turns.length} msg
                        </span>
                      </div>
                      <p className={`text-sm font-medium truncate ${selectedSession?.id === session.id ? 'text-white' : 'text-slate-300'}`}>
                        {session.topic || "Discussion sans titre"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main Content: Session Details */}
            <div className={`flex-1 flex flex-col bg-slate-900/20 overflow-hidden ${!selectedSession ? 'hidden md:flex' : 'flex'}`}>
              {selectedSession ? (
                <>
                  {/* Session Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                    <button 
                      onClick={() => onSelectSession(null)}
                      className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                      <h3 className="font-bold text-white truncate">{selectedSession.topic}</h3>
                      <p className="text-xs text-slate-500">
                        {new Date(selectedSession.startTime).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Transcript */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                    {selectedSession.turns.map((turn, idx) => (
                      <div key={idx} className={`flex flex-col ${turn.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                           {turn.speaker === 'user' ? (
                             <>
                               <span className="text-[10px] text-slate-500">{userName}</span>
                               <User className="w-3 h-3 text-slate-600" />
                             </>
                           ) : (
                             <>
                               <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
                               <span className="text-[10px] text-slate-500">NeuroChat</span>
                             </>
                           )}
                        </div>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                          turn.speaker === 'user' 
                          ? 'bg-slate-800 text-slate-100 rounded-tr-none' 
                          : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                        }`}>
                          {turn.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                   <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                     <History className="w-10 h-10 text-slate-700" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-300 mb-2">Sélectionnez une session</h3>
                   <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                     Parcourez vos anciennes conversations pour retrouver des informations ou voir votre progression.
                   </p>
                   
                   {/* Stats Grid */}
                   <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-sm">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <div className="text-2xl font-bold text-white">{memoryData?.totalSessions || 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sessions</div>
                      </div>
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                        <div className="text-2xl font-bold text-white">{memoryData?.totalTurns || 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Messages</div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-4 text-[10px] text-slate-600">
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                STOCKAGE LOCAL SÉCURISÉ
             </div>
             <div className="w-1 h-1 rounded-full bg-slate-700"></div>
             <div>CHIFFREMENT AES-256 (SIMULÉ)</div>
             <div className="w-1 h-1 rounded-full bg-slate-700"></div>
             <div>AUTO-NETTOYAGE APRÈS 50 SESSIONS</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

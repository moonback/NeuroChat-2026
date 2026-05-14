import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  MessageSquare,
  Trash2,
  X,
  ChevronRight,
  History,
  User,
  BookOpen,
  CalendarDays,
  Tag,
  Loader2,
} from "lucide-react";
import { ConversationSession, loadAllSessions } from "../lib/conversationMemory";
import {
  loadWeeklySummaries,
  generateWeeklySummary,
  WeeklySummary,
  getWeekId,
} from "../lib/conversationSummary";

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

type Tab = "sessions" | "weekly";

export function ConversationVault({
  isOpen,
  onClose,
  userName,
  memoryData,
  selectedSession,
  onSelectSession,
  onClearMemory,
  accentColor,
}: ConversationVaultProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>(
    () => loadWeeklySummaries()
  );
  const [generatingWeek, setGeneratingWeek] = useState<string | null>(null);

  if (!isOpen) return null;

  // ── Weekly summary helpers ──────────────────────────────────────────────────

  const handleGenerateWeekly = async (weekId?: string) => {
    const target = weekId ?? getWeekId(new Date());
    setGeneratingWeek(target);
    try {
      const sessions = loadAllSessions().filter((s) => s.userName === userName);
      const result = await generateWeeklySummary(sessions, userName, target);
      if (result) {
        setWeeklySummaries(loadWeeklySummaries());
      }
    } catch (err) {
      console.error("[Vault] Weekly generation failed:", err);
    } finally {
      setGeneratingWeek(null);
    }
  };

  // Group sessions by ISO week for the weekly tab
  const sessionsByWeek = (memoryData?.sessions ?? []).reduce(
    (acc: Record<string, ConversationSession[]>, s: ConversationSession) => {
      const wk = getWeekId(new Date(s.startTime));
      if (!acc[wk]) acc[wk] = [];
      acc[wk].push(s);
      return acc;
    },
    {}
  );

  const weekIds = Object.keys(sessionsByWeek).sort().reverse();

  // ── Render ──────────────────────────────────────────────────────────────────

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
          className="bg-[#0F172A] border border-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
          style={{ boxShadow: `0 0 80px ${accentColor}15` }}
        >
          {/* ── Header ── */}
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
                <p className="text-sm text-slate-500">
                  Exploration de la mémoire de NeuroChat
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-slate-800 bg-slate-900/30">
            <button
              onClick={() => { setActiveTab("sessions"); onSelectSession(null); }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "sessions"
                  ? "border-current text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === "sessions" ? { color: accentColor, borderColor: accentColor } : {}}
            >
              <MessageSquare className="w-4 h-4" />
              Sessions
            </button>
            <button
              onClick={() => { setActiveTab("weekly"); onSelectSession(null); }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "weekly"
                  ? "border-current text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === "weekly" ? { color: accentColor, borderColor: accentColor } : {}}
            >
              <CalendarDays className="w-4 h-4" />
              Synthèses hebdomadaires
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 flex overflow-hidden">

            {/* ════ SESSIONS TAB ════ */}
            {activeTab === "sessions" && (
              <>
                {/* Sidebar */}
                <div
                  className={`w-full md:w-80 border-r border-slate-800 overflow-y-auto ${
                    selectedSession ? "hidden md:block" : "block"
                  }`}
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between px-2 mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Sessions Récentes
                      </span>
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
                        <p className="text-slate-600 text-sm italic">
                          Aucune mémoire disponible
                        </p>
                      </div>
                    ) : (
                      memoryData.sessions.map((session: ConversationSession) => (
                        <button
                          key={session.id}
                          onClick={() => onSelectSession(session.id)}
                          className={`w-full text-left p-4 rounded-2xl transition-all border ${
                            selectedSession?.id === session.id
                              ? "bg-slate-800/50 border-slate-700 shadow-lg"
                              : "bg-transparent border-transparent hover:bg-slate-800/30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(session.startTime).toLocaleDateString(
                                "fr-FR",
                                { day: "2-digit", month: "2-digit" }
                              )}
                            </span>
                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                              {session.turns.length} msg
                            </span>
                          </div>
                          <p
                            className={`text-sm font-medium truncate ${
                              selectedSession?.id === session.id
                                ? "text-white"
                                : "text-slate-300"
                            }`}
                          >
                            {session.topic || "Discussion sans titre"}
                          </p>
                          {/* Session summary preview */}
                          {session.summary && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {session.summary}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Session Detail */}
                <div
                  className={`flex-1 flex flex-col bg-slate-900/20 overflow-hidden ${
                    !selectedSession ? "hidden md:flex" : "flex"
                  }`}
                >
                  {selectedSession ? (
                    <>
                      {/* Session Header */}
                      <div className="p-4 border-b border-slate-800 flex items-start gap-3">
                        <button
                          onClick={() => onSelectSession(null)}
                          className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400 mt-0.5"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate">
                            {selectedSession.topic}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {new Date(selectedSession.startTime).toLocaleString(
                              "fr-FR"
                            )}
                          </p>
                          {/* AI Summary badge */}
                          {selectedSession.summary && (
                            <div className="mt-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <BookOpen className="w-3 h-3" style={{ color: accentColor }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                                  Résumé IA
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {selectedSession.summary}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transcript */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {selectedSession.turns.map((turn, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col ${
                              turn.speaker === "user" ? "items-end" : "items-start"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 px-1">
                              {turn.speaker === "user" ? (
                                <>
                                  <span className="text-[10px] text-slate-500">
                                    {userName}
                                  </span>
                                  <User className="w-3 h-3 text-slate-600" />
                                </>
                              ) : (
                                <>
                                  <Sparkles
                                    className="w-3 h-3"
                                    style={{ color: accentColor }}
                                  />
                                  <span className="text-[10px] text-slate-500">
                                    NeuroChat
                                  </span>
                                </>
                              )}
                            </div>
                            <div
                              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                turn.speaker === "user"
                                  ? "bg-slate-800 text-slate-100 rounded-tr-none"
                                  : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none"
                              }`}
                            >
                              {turn.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                        <History className="w-10 h-10 text-slate-700" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-300 mb-2">
                        Sélectionnez une session
                      </h3>
                      <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                        Parcourez vos anciennes conversations pour retrouver des
                        informations ou voir votre progression.
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-12 w-full max-w-sm">
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                          <div className="text-2xl font-bold text-white">
                            {memoryData?.totalSessions || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Sessions
                          </div>
                        </div>
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                          <div className="text-2xl font-bold text-white">
                            {memoryData?.totalTurns || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Messages
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ════ WEEKLY TAB ════ */}
            {activeTab === "weekly" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {weekIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <CalendarDays className="w-12 h-12 text-slate-700 mb-4 opacity-30" />
                    <h3 className="text-lg font-bold text-slate-400 mb-2">
                      Aucune synthèse disponible
                    </h3>
                    <p className="text-slate-600 text-sm max-w-xs">
                      Les synthèses sont générées automatiquement à la fin de chaque
                      session. Commencez à discuter pour en créer une !
                    </p>
                  </div>
                ) : (
                  weekIds.map((weekId) => {
                    const sessions = sessionsByWeek[weekId] as ConversationSession[];
                    const summary = weeklySummaries.find((s) => s.weekId === weekId);
                    const isCurrentWeek = weekId === getWeekId(new Date());
                    const isGenerating = generatingWeek === weekId;

                    return (
                      <motion.div
                        key={weekId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden"
                      >
                        {/* Week header */}
                        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                              style={{ background: `${accentColor}20`, color: accentColor }}
                            >
                              {isCurrentWeek ? "📅" : "🗓️"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {summary?.dateRange ?? weekId}
                                </span>
                                {isCurrentWeek && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{
                                      background: `${accentColor}20`,
                                      color: accentColor,
                                    }}
                                  >
                                    CETTE SEMAINE
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {sessions.length} session{sessions.length > 1 ? "s" : ""} ·{" "}
                                {sessions.reduce((n, s) => n + s.turns.length, 0)} échanges
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleGenerateWeekly(weekId)}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                            style={{
                              background: `${accentColor}15`,
                              color: accentColor,
                              border: `1px solid ${accentColor}30`,
                            }}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Génération...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                {summary ? "Régénérer" : "Générer"}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Summary content */}
                        {summary ? (
                          <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {summary.text}
                            </p>
                            {summary.topics.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {summary.topics.map((topic, i) => (
                                  <span
                                    key={i}
                                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                                    style={{
                                      background: `${accentColor}12`,
                                      color: accentColor,
                                      border: `1px solid ${accentColor}25`,
                                    }}
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-600">
                              Généré le{" "}
                              {new Date(summary.generatedAt).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        ) : (
                          <div className="p-5 text-center">
                            <p className="text-sm text-slate-600 italic">
                              Cliquez sur "Générer" pour créer la synthèse de cette semaine.
                            </p>
                          </div>
                        )}

                        {/* Session list for this week */}
                        <div className="px-5 pb-4 flex flex-wrap gap-2">
                          {sessions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setActiveTab("sessions");
                                onSelectSession(s.id);
                              }}
                              className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                            >
                              {new Date(s.startTime).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                              })}{" "}
                              · {s.turns.length} msg
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-4 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              STOCKAGE LOCAL SÉCURISÉ
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700"></div>
            <div>SYNTHÈSES IA AUTOMATIQUES</div>
            <div className="w-1 h-1 rounded-full bg-slate-700"></div>
            <div>AUTO-NETTOYAGE APRÈS 50 SESSIONS</div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

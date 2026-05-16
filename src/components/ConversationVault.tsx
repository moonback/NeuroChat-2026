import { useState, useMemo, useEffect } from "react";
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
  BrainCircuit,
  Search,
} from "lucide-react";
import { ConversationSession, loadAllSessions } from "../lib/conversationMemory";
import type { ConversationStats } from "../lib/conversationMemory";
import {
  loadWeeklySummaries,
  generateWeeklySummary,
  WeeklySummary,
  getWeekId,
} from "../lib/conversationSummary";
import { PromptVersionDisplay } from "./learning/PromptVersionDisplay";
import { PromptControlPanel } from "./learning/PromptControlPanel";

interface ConversationVaultProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  memoryData: ConversationStats | null;
  selectedSession: ConversationSession | null;
  onSelectSession: (id: string | null) => void;
  onClearMemory: () => void;
  accentColor: string;
}

type Tab = "sessions" | "weekly" | "learning";

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
    () => []
  );
  const [generatingWeek, setGeneratingWeek] = useState<string | null>(null);
  const [learningRefreshKey, setLearningRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");


  // ── Weekly summary helpers ──────────────────────────────────────────────────

  const handleGenerateWeekly = async (weekId?: string) => {
    const target = weekId ?? getWeekId(new Date());
    console.log(`[ConversationVault] 📅 Génération de la synthèse hebdomadaire pour: ${target}`);
    setGeneratingWeek(target);
    try {
      const sessions = (await loadAllSessions()).filter((s) => s.userName === userName);
      console.log(`[ConversationVault] 📊 ${sessions.length} session(s) trouvée(s) pour ${userName}`);
      const result = await generateWeeklySummary(sessions, userName, target);
      if (result) {
        console.log("[ConversationVault] ✅ Synthèse générée avec succès");
        setWeeklySummaries(await loadWeeklySummaries());
      } else {
        const totalTurns = sessions.reduce((n, s) => n + s.turns.length, 0);
        console.log(`[ConversationVault] ⚠️ Aucune synthèse générée (Seuil: ${totalTurns}/2 tours)`);
      }
    } catch (err) {
      console.error("[ConversationVault] ❌ Échec de la génération hebdomadaire:", err);
    } finally {
      setGeneratingWeek(null);
      console.log("[ConversationVault] 🏁 Génération terminée");
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log(`[ConversationVault] 🏛️ Rendu du Coffre - userName: ${userName}`);
      console.log(`[ConversationVault] 📊 Données de mémoire:`, memoryData);
    }
  }, [isOpen, userName, memoryData]);

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    const sessions = memoryData?.sessions ?? [];
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.topic?.toLowerCase().includes(query) ||
        s.summary?.toLowerCase().includes(query) ||
        s.turns.some((t) => t.message.toLowerCase().includes(query))
    );
  }, [memoryData?.sessions, searchQuery]);

  // Group filtered sessions by ISO week for the weekly tab
  const { sessionsByWeek, weekIds } = useMemo(() => {
    const grouped = filteredSessions.reduce(
      (acc: Record<string, ConversationSession[]>, s: ConversationSession) => {
        const wk = getWeekId(new Date(s.startTime));
        if (!acc[wk]) acc[wk] = [];
        acc[wk].push(s);
        return acc;
      },
      {}
    );
    const ids = Object.keys(grouped).sort().reverse();
    return { sessionsByWeek: grouped, weekIds: ids };
  }, [filteredSessions]);

  useEffect(() => {
    if (isOpen) {
      console.log(`[ConversationVault] 📅 ${weekIds.length} semaine(s) avec des sessions`);
    }
  }, [isOpen, weekIds.length]);

  // Early return APRÈS tous les hooks
  if (!isOpen) {
    return null;
  }

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
          className="bg-[#0F172A] border border-slate-800/50 rounded-[40px] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden relative"
          style={{ 
            boxShadow: `0 0 80px ${accentColor}15`,
          }}
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-noise pointer-events-none opacity-[0.03]" />
          <div 
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
            style={{ background: `${accentColor}10` }}
          />
          <div 
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
            style={{ background: `${accentColor}05` }}
          />

          {/* ── Header ── */}
          <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between bg-slate-900/40 backdrop-blur-xl relative z-10 gap-6">
            <div className="flex items-center gap-5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/5"
                style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05)`, boxShadow: `0 8px 24px -8px ${accentColor}40` }}
              >
                🧠
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                  Coffre des Conversations
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 uppercase tracking-widest">
                    Système Neuronal
                  </span>
                </h2>
                <p className="text-sm text-slate-400 font-medium">
                  Exploration et analyse de la mémoire de NeuroChat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-white/20 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-white/5"
                />
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-slate-800 bg-slate-900/30">
            <button
              onClick={() => { 
                console.log("[ConversationVault] 🔄 Changement d'onglet vers: sessions");
                setActiveTab("sessions"); 
                onSelectSession(null); 
              }}
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
              onClick={() => { 
                console.log("[ConversationVault] 🔄 Changement d'onglet vers: weekly");
                setActiveTab("weekly"); 
                onSelectSession(null); 
              }}
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
            <button
              onClick={() => { 
                console.log("[ConversationVault] 🔄 Changement d'onglet vers: learning");
                setActiveTab("learning"); 
                onSelectSession(null); 
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "learning"
                  ? "border-current text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === "learning" ? { color: accentColor, borderColor: accentColor } : {}}
            >
              <BrainCircuit className="w-4 h-4" />
              Apprentissage
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

                    {!filteredSessions?.length ? (
                      <div className="text-center py-20 px-4">
                        <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mx-auto mb-4 border border-slate-800">
                          <History className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">
                          {searchQuery ? "Aucun résultat trouvé" : "Aucune mémoire disponible"}
                        </p>
                      </div>
                    ) : (
                      filteredSessions.map((session: ConversationSession, idx: number) => (
                        <motion.button
                          key={session.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => {
                            console.log(`[ConversationVault] 🎯 Sélection de la session: ${session.id}`);
                            onSelectSession(session.id);
                          }}
                          className={`w-full text-left p-4 rounded-[24px] transition-all border group relative overflow-hidden ${
                            selectedSession?.id === session.id
                              ? "bg-white/5 border-white/10 shadow-xl"
                              : "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5"
                          }`}
                        >
                          {selectedSession?.id === session.id && (
                            <div 
                              className="absolute inset-y-0 left-0 w-1 rounded-full my-4"
                              style={{ background: accentColor }}
                            />
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {new Date(session.startTime).toLocaleDateString(
                                "fr-FR",
                                { day: "2-digit", month: "2-digit" }
                              )}
                            </span>
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-400 border border-white/5">
                              {session.turns.length} messages
                            </span>
                          </div>
                          <p
                            className={`text-sm font-bold truncate mb-1.5 transition-colors ${
                              selectedSession?.id === session.id
                                ? "text-white"
                                : "text-slate-300 group-hover:text-white"
                            }`}
                          >
                            {session.topic || "Discussion sans titre"}
                          </p>
                          {session.summary && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                              {session.summary}
                            </p>
                          )}
                        </motion.button>
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
                      <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {selectedSession.turns.map((turn, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex flex-col ${
                              turn.speaker === "user" ? "items-end" : "items-start"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2 px-1">
                              {turn.speaker === "user" ? (
                                <>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    {userName}
                                  </span>
                                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                                    <User className="w-3 h-3 text-slate-400" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center border border-white/5"
                                    style={{ background: `${accentColor}20` }}
                                  >
                                    <Sparkles
                                      className="w-3 h-3"
                                      style={{ color: accentColor }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    NeuroChat
                                  </span>
                                </>
                              )}
                              <span className="text-[9px] text-slate-600 font-mono ml-2">
                                {turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                              </span>
                            </div>
                            <div
                              className={`max-w-[85%] p-5 rounded-[28px] text-sm leading-relaxed shadow-lg relative ${
                                turn.speaker === "user"
                                  ? "bg-slate-800 text-slate-100 rounded-tr-none border border-white/5"
                                  : "bg-slate-900/50 backdrop-blur-sm border border-slate-800 text-slate-300 rounded-tl-none"
                              }`}
                            >
                              {turn.speaker !== "user" && (
                                <div 
                                  className="absolute inset-0 rounded-[28px] rounded-tl-none pointer-events-none opacity-10"
                                  style={{ background: `linear-gradient(135deg, ${accentColor}, transparent)` }}
                                />
                              )}
                              <div className="relative z-10">
                                {turn.message}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
                      <div 
                        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-[0.03] pointer-events-none"
                        style={{ background: accentColor }}
                      />
                      <div className="w-32 h-32 rounded-[40px] bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-2xl relative z-10">
                        <History className="w-12 h-12 text-slate-400" />
                        <div 
                          className="absolute inset-0 rounded-[40px] blur-xl opacity-20"
                          style={{ background: accentColor }}
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 relative z-10">
                        Sélectionnez une session
                      </h3>
                      <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed font-medium relative z-10">
                        Parcourez l'historique de vos interactions pour retrouver des
                        connaissances ou analyser votre évolution.
                      </p>
                      <div className="grid grid-cols-2 gap-6 mt-16 w-full max-w-md relative z-10">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[24px] backdrop-blur-md">
                          <div className="text-3xl font-bold text-white mb-1">
                            {memoryData?.totalSessions || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                            Sessions totales
                          </div>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[24px] backdrop-blur-md">
                          <div className="text-3xl font-bold text-white mb-1">
                            {memoryData?.totalTurns || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                            Messages échangés
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
                        className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-md shadow-xl"
                      >
                        {/* Week header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5"
                              style={{ background: `${accentColor}15`, color: accentColor }}
                            >
                              {isCurrentWeek ? "📅" : "🗓️"}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-base font-bold text-white tracking-tight">
                                  {summary?.dateRange ?? weekId}
                                </span>
                                {isCurrentWeek && (
                                  <span
                                    className="text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border"
                                    style={{
                                      background: `${accentColor}15`,
                                      color: accentColor,
                                      borderColor: `${accentColor}30`,
                                    }}
                                  >
                                    En cours
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-medium">
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


            {/* ════ LEARNING TAB ════ */}
            {activeTab === "learning" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                  <PromptVersionDisplay
                    userId={userName || "anonymous"}
                    accentColor={accentColor}
                    refreshKey={learningRefreshKey}
                  />
                  <PromptControlPanel
                    userId={userName || "anonymous"}
                    accentColor={accentColor}
                    onChanged={() => setLearningRefreshKey((key) => key + 1)}
                    onManualCycle={() => setLearningRefreshKey((key) => key + 1)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="p-5 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 px-8 relative z-10">
            <div className="flex items-center gap-6 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                SÉCURISÉ
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-800"></div>
              <div>SYNTHÈSES IA</div>
              <div className="w-1 h-1 rounded-full bg-slate-800"></div>
              <div>AUTO-NETTOYAGE</div>
            </div>
            
            <div className="text-[10px] text-slate-600 font-medium">
              NeuroChat Architecture © 2026 · Conversation Vault v2.4.0
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

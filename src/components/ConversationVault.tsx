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
  Pencil,
  Save,
  ShieldCheck,
  Clock,
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
import { loadSkillPolicyConfig, saveSkillPolicyConfig, type SkillPolicyConfig } from "../lib/skills/policyStore";
import type { SkillPermission } from "../lib/skills/types";

interface ConversationVaultProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  memoryData: ConversationStats | null;
  selectedSession: ConversationSession | null;
  onSelectSession: (id: string | null) => void;
  onClearMemory: () => void;
  onUpdateTurn: (sessionId: string, timestamp: number, message: string) => Promise<void>;
  onDeleteTurn: (sessionId: string, timestamp: number) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  accentColor: string;
}

type Tab = "sessions" | "weekly" | "learning" | "permissions";

const PERMISSION_RESOURCES = ["filesystem", "browser", "memory", "desktop", "ai", "system"] as const;
const PERMISSION_LEVELS: SkillPermission["level"][] = ["read", "write", "execute"];

export function ConversationVault({
  isOpen,
  onClose,
  userName,
  memoryData,
  selectedSession,
  onSelectSession,
  onClearMemory,
  onUpdateTurn,
  onDeleteTurn,
  onDeleteSession,
  accentColor,
}: ConversationVaultProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>(
    () => []
  );
  const [generatingWeek, setGeneratingWeek] = useState<string | null>(null);
  const [learningRefreshKey, setLearningRefreshKey] = useState(0);
  const [editingTurn, setEditingTurn] = useState<{ sessionId: string; timestamp: number } | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [memoryActionStatus, setMemoryActionStatus] = useState<string | null>(null);
  const [permissionPolicy, setPermissionPolicy] = useState<SkillPolicyConfig | null>(null);
  const [permissionDuration, setPermissionDuration] = useState("3600000");
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);


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

  // Group sessions by ISO week for the weekly tab
  const { sessionsByWeek, weekIds } = useMemo(() => {
    const grouped = (memoryData?.sessions ?? []).reduce(
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
  }, [memoryData?.sessions]);

  useEffect(() => {
    if (isOpen) {
      void loadSkillPolicyConfig().then((policy) => {
        setPermissionPolicy(policy);
        setPermissionDuration(policy.expiresAt ? "3600000" : "0");
      });
    }
  }, [isOpen]);

  const handleStartEditTurn = (turn: ConversationSession["turns"][number]) => {
    if (!selectedSession) return;
    setEditingTurn({ sessionId: selectedSession.id, timestamp: turn.timestamp });
    setEditedMessage(turn.message);
  };

  const handleSaveTurn = async () => {
    if (!editingTurn) return;
    setMemoryActionStatus("Sauvegarde du message...");
    await onUpdateTurn(editingTurn.sessionId, editingTurn.timestamp, editedMessage);
    setEditingTurn(null);
    setEditedMessage("");
    setMemoryActionStatus("Message mis à jour et mémoire vectorielle resynchronisée.");
  };

  const handleDeleteTurn = async (timestamp: number) => {
    if (!selectedSession || !window.confirm("Oublier ce message de la timeline ?")) return;
    setMemoryActionStatus("Suppression du message...");
    await onDeleteTurn(selectedSession.id, timestamp);
    setMemoryActionStatus("Message oublié et mémoire vectorielle resynchronisée.");
  };

  const handleDeleteSession = async () => {
    if (!selectedSession || !window.confirm("Oublier toute cette session ?")) return;
    setMemoryActionStatus("Suppression de la session...");
    await onDeleteSession(selectedSession.id);
    setMemoryActionStatus("Session oubliée et mémoire vectorielle resynchronisée.");
  };

  const toggleScopedPermission = (resource: string, level: SkillPermission["level"]) => {
    setPermissionPolicy((current) => {
      const policy = current ?? { roles: ["user"], allow: {}, deny: [] };
      const currentLevels = policy.allow[resource] ?? [];
      const nextLevels = currentLevels.includes(level)
        ? currentLevels.filter((item) => item !== level)
        : [...currentLevels, level];
      return { ...policy, allow: { ...policy.allow, [resource]: nextLevels } };
    });
  };

  const toggleDeniedSkill = (skillName: string) => {
    setPermissionPolicy((current) => {
      const policy = current ?? { roles: ["user"], allow: {}, deny: [] };
      return {
        ...policy,
        deny: policy.deny.includes(skillName)
          ? policy.deny.filter((item) => item !== skillName)
          : [...policy.deny, skillName],
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionPolicy) return;
    const durationMs = Number(permissionDuration);
    const expiresAt = durationMs > 0 ? Date.now() + durationMs : undefined;
    const nextPolicy = { ...permissionPolicy, expiresAt };
    await saveSkillPolicyConfig(nextPolicy);
    setPermissionPolicy(nextPolicy);
    setPermissionStatus(expiresAt ? `Permissions valables jusqu’à ${new Date(expiresAt).toLocaleTimeString("fr-FR")}.` : "Permissions persistantes enregistrées.");
  };

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
            <button
              onClick={() => {
                console.log("[ConversationVault] 🔄 Changement d'onglet vers: permissions");
                setActiveTab("permissions");
                onSelectSession(null);
              }}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "permissions"
                  ? "border-current text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              style={activeTab === "permissions" ? { color: accentColor, borderColor: accentColor } : {}}
            >
              <ShieldCheck className="w-4 h-4" />
              Permissions
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
                          onClick={() => {
                            console.log(`[ConversationVault] 🎯 Sélection de la session: ${session.id}`);
                            onSelectSession(session.id);
                          }}
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
                          <button
                            onClick={handleDeleteSession}
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-red-300 hover:text-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                            Oublier cette session
                          </button>
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
                        {memoryActionStatus && (
                          <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                            {memoryActionStatus}
                          </div>
                        )}
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
                            {editingTurn?.sessionId === selectedSession.id && editingTurn.timestamp === turn.timestamp ? (
                              <div className="w-full max-w-[85%] space-y-2">
                                <textarea
                                  value={editedMessage}
                                  onChange={(event) => setEditedMessage(event.target.value)}
                                  className="w-full min-h-28 p-3 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-slate-500"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditingTurn(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300">Annuler</button>
                                  <button onClick={handleSaveTurn} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: accentColor, color: "#020617" }}>
                                    <Save className="w-3 h-3 inline mr-1" /> Sauver
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group max-w-[85%]">
                                <div
                                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                    turn.speaker === "user"
                                      ? "bg-slate-800 text-slate-100 rounded-tr-none"
                                      : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none"
                                  }`}
                                >
                                  {turn.message}
                                </div>
                                <div className="mt-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleStartEditTurn(turn)} className="text-[10px] text-slate-500 hover:text-slate-200 flex items-center gap-1">
                                    <Pencil className="w-3 h-3" /> Modifier
                                  </button>
                                  <button onClick={() => handleDeleteTurn(turn.timestamp)} className="text-[10px] text-red-400/70 hover:text-red-300 flex items-center gap-1">
                                    <Trash2 className="w-3 h-3" /> Oublier
                                  </button>
                                </div>
                              </div>
                            )}
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


            {/* ════ PERMISSIONS TAB ════ */}
            {activeTab === "permissions" && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" style={{ color: accentColor }} />
                        Centre de permissions
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Accorde des droits temporaires et limités par ressource aux skills.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-4 h-4" /> Durée
                      <select
                        value={permissionDuration}
                        onChange={(event) => setPermissionDuration(event.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                      >
                        <option value="900000">15 min</option>
                        <option value="3600000">1 heure</option>
                        <option value="28800000">Session longue (8h)</option>
                        <option value="0">Persistant</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3">
                    {PERMISSION_RESOURCES.map((resource) => (
                      <div key={resource} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{resource}</div>
                          <div className="text-xs text-slate-500">Scope de ressource</div>
                        </div>
                        <div className="flex gap-2">
                          {PERMISSION_LEVELS.map((level) => {
                            const enabled = permissionPolicy?.allow[resource]?.includes(level) ?? false;
                            return (
                              <button
                                key={level}
                                onClick={() => toggleScopedPermission(resource, level)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${enabled ? "text-slate-950" : "text-slate-500 border-slate-700"}`}
                                style={enabled ? { background: accentColor, borderColor: accentColor } : {}}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300">
                    Bloquer le skill sensible <code className="text-xs text-slate-500">open_website</code>
                    <input
                      type="checkbox"
                      checked={permissionPolicy?.deny.includes("open_website") ?? true}
                      onChange={() => toggleDeniedSkill("open_website")}
                    />
                  </label>

                  <button
                    onClick={handleSavePermissions}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: accentColor, color: "#020617" }}
                  >
                    <Save className="w-4 h-4" /> Enregistrer les permissions
                  </button>
                  {permissionStatus && <p className="text-xs text-slate-400">{permissionStatus}</p>}
                </div>
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

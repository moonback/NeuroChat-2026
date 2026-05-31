import { useState, useCallback, useMemo, useEffect } from "react";
import { loadUserName, saveUserName } from "../lib/avatarConfig";
import { 
  addConversationTurn, 
  clearConversationHistory, 
  getConversationStats,
  updateConversationTurn,
  deleteConversationTurn,
  deleteConversationSession
} from "../lib/conversationMemory";

export function useConversationMemory() {
  const [{ userName, showWelcomeModal }, setUserContext] = useState({ userName: "", showWelcomeModal: true });

  useEffect(() => {
    loadUserName().then((initialUserName) => {
      setUserContext({ userName: initialUserName, showWelcomeModal: !initialUserName });
    });
  }, []);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [memoryRevision, setMemoryRevision] = useState(0);

  const handleWelcomeSubmit = useCallback((name: string) => {
    console.log(`[useConversationMemory] 👋 Soumission du nom d'utilisateur: ${name}`);
    setUserContext((prev) => ({ ...prev, userName: name, showWelcomeModal: false }));
void saveUserName(name);
    console.log("[useConversationMemory] ✅ Modal de bienvenue fermée");
  }, []);

  const handleClearMemory = useCallback(async () => {
    console.log("[useConversationMemory] 🗑️ Demande d'effacement de la mémoire");
    if (window.confirm("Êtes-vous sûr de vouloir effacer toute la mémoire des conversations ? Cette action est irréversible.")) {
      console.log("[useConversationMemory] ✅ Confirmation reçue, effacement en cours...");
      await clearConversationHistory();
      setShowMemoryModal(false);
      setSelectedSessionId(null);
      setMemoryRevision((revision) => revision + 1);
      alert("La mémoire a été effacée avec succès !");
      console.log("[useConversationMemory] ✅ État mémoire local réinitialisé");
    } else {
      console.log("[useConversationMemory] ❌ Effacement annulé par l'utilisateur");
    }
  }, []);

  const updateUserName = useCallback((name: string) => {
    setUserContext((prev) => ({ ...prev, userName: name }));
void saveUserName(name);
  }, []);

  // Compute stats and session list
  const [memoryData, setMemoryData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userName) return;
    getConversationStats(userName).then((stats) => { if (!cancelled) setMemoryData(stats); });
    return () => { cancelled = true; };
  }, [userName, memoryRevision]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !memoryData) return null;
    return memoryData.sessions.find(s => s.id === selectedSessionId) || null;
  }, [selectedSessionId, memoryData]);

  useEffect(() => {
    if (selectedSessionId && !selectedSession) {
      setSelectedSessionId(null);
    }
  }, [selectedSessionId, selectedSession]);


  const refreshMemory = useCallback(() => {
    setMemoryRevision((revision) => revision + 1);
  }, []);

  const handleUpdateTurn = useCallback(async (sessionId: string, timestamp: number, message: string) => {
    await updateConversationTurn(sessionId, timestamp, message);
    refreshMemory();
  }, [refreshMemory]);

  const handleDeleteTurn = useCallback(async (sessionId: string, timestamp: number) => {
    await deleteConversationTurn(sessionId, timestamp);
    refreshMemory();
  }, [refreshMemory]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteConversationSession(sessionId);
    setSelectedSessionId(null);
    refreshMemory();
  }, [refreshMemory]);

  const addTurn = useCallback(
    (name: string, speaker: "user" | "assistant" | "child" | "companion", message: string) => {
      void addConversationTurn(name, speaker, message);
      setMemoryRevision((revision) => revision + 1);
    },
    []
  );

  return {
    userName,
    showWelcomeModal,
    showMemoryModal,
    setShowMemoryModal,
    handleWelcomeSubmit,
    handleClearMemory,
    updateUserName,
    memoryData,
    selectedSession,
    setSelectedSessionId,
    updateTurn: handleUpdateTurn,
    deleteTurn: handleDeleteTurn,
    deleteSession: handleDeleteSession,
    addTurn
  };
}

import { useState, useCallback, useMemo } from "react";
import { loadUserName, saveUserName } from "../lib/avatarConfig";
import { 
  addConversationTurn, 
  clearConversationHistory, 
  getConversationStats,
  loadAllSessions,
  getUserProfile,
  ConversationSession
} from "../lib/conversationMemory";

export function useConversationMemory() {
  const [initialUserName] = useState(() => loadUserName());
  const [userName, setUserName] = useState<string>(initialUserName);
  const [showWelcomeModal, setShowWelcomeModal] = useState(!initialUserName);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [memoryRevision, setMemoryRevision] = useState(0);

  const handleWelcomeSubmit = useCallback((name: string) => {
    console.log(`[useConversationMemory] 👋 Soumission du nom d'utilisateur: ${name}`);
    setUserName(name);
    saveUserName(name);
    setShowWelcomeModal(false);
    console.log("[useConversationMemory] ✅ Modal de bienvenue fermée");
  }, []);

  const handleClearMemory = useCallback(() => {
    console.log("[useConversationMemory] 🗑️ Demande d'effacement de la mémoire");
    if (window.confirm("Êtes-vous sûr de vouloir effacer toute la mémoire des conversations ? Cette action est irréversible.")) {
      console.log("[useConversationMemory] ✅ Confirmation reçue, effacement en cours...");
      clearConversationHistory();
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
    setUserName(name);
    saveUserName(name);
  }, []);

  // Compute stats and session list
  const memoryData = useMemo(() => {
    console.log("[useConversationMemory] 📊 Calcul des données de mémoire...");
    if (!userName) {
      console.log("[useConversationMemory] ⚠️ Pas de nom d'utilisateur, données nulles");
      return null;
    }
    const data = getConversationStats(userName);
    console.log(`[useConversationMemory] ✅ Données calculées: ${data.totalSessions} sessions`);
    return data;
  }, [userName, showMemoryModal, memoryRevision]); // Refresh when memory changes

  const selectedSession = useMemo(() => {
    console.log(`[useConversationMemory] 🔍 Recherche de la session sélectionnée: ${selectedSessionId}`);
    if (!selectedSessionId || !memoryData) {
      console.log("[useConversationMemory] ℹ️ Aucune session sélectionnée");
      return null;
    }
    const session = memoryData.sessions.find(s => s.id === selectedSessionId) || null;
    if (session) {
      console.log(`[useConversationMemory] ✅ Session trouvée: ${session.topic} (${session.turns.length} tours)`);
    } else {
      console.log("[useConversationMemory] ⚠️ Session non trouvée");
    }
    return session;
  }, [selectedSessionId, memoryData]);

  const addTurn = useCallback(
    (name: string, speaker: "user" | "assistant" | "child" | "companion", message: string) => {
      addConversationTurn(name, speaker, message);
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
    addTurn
  };
}

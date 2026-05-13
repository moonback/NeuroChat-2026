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
  const [userName, setUserName] = useState(loadUserName());
  const [showWelcomeModal, setShowWelcomeModal] = useState(!loadUserName());
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleWelcomeSubmit = useCallback((name: string) => {
    setUserName(name);
    saveUserName(name);
    setShowWelcomeModal(false);
  }, []);

  const handleClearMemory = useCallback(() => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer toute la mémoire des conversations ? Cette action est irréversible.")) {
      clearConversationHistory();
      setShowMemoryModal(false);
      alert("La mémoire a été effacée avec succès !");
      window.location.reload(); // Refresh to clear state
    }
  }, []);

  const updateUserName = useCallback((name: string) => {
    setUserName(name);
    saveUserName(name);
  }, []);

  // Compute stats and session list
  const memoryData = useMemo(() => {
    if (!userName) return null;
    return getConversationStats(userName);
  }, [userName, showMemoryModal]); // Refresh when modal opens

  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !memoryData) return null;
    return memoryData.sessions.find(s => s.id === selectedSessionId) || null;
  }, [selectedSessionId, memoryData]);

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
    addTurn: addConversationTurn
  };
}

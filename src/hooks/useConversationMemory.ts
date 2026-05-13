import { useState, useCallback } from "react";
import { loadUserName, saveUserName } from "../lib/avatarConfig";
import { addConversationTurn, clearConversationHistory, getConversationStats } from "../lib/conversationMemory";

export function useConversationMemory() {
  const [userName, setUserName] = useState(loadUserName());
  const [showWelcomeModal, setShowWelcomeModal] = useState(!loadUserName());
  const [showMemoryModal, setShowMemoryModal] = useState(false);

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
    }
  }, []);

  const updateUserName = useCallback((name: string) => {
    setUserName(name);
    saveUserName(name);
  }, []);

  const stats = userName ? getConversationStats(userName) : null;

  return {
    userName,
    showWelcomeModal,
    showMemoryModal,
    setShowMemoryModal,
    handleWelcomeSubmit,
    handleClearMemory,
    updateUserName,
    stats,
    addTurn: addConversationTurn
  };
}

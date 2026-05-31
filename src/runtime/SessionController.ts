import { useCallback, type RefObject } from "react";

import { parseAssistantResponse } from "../lib/commandParser";
import type { AvatarId } from "../lib/avatarConfig";
import type { EmotionEngine } from "../lib/EmotionEngine";

type ConversationStatus = "idle" | "connecting" | "listening";
type SendInput = (base64: string, type: "audio" | "video") => void;
type AddTurn = (userName: string, speaker: "user" | "assistant", message: string) => void;

type StartSession = (options: {
  avatarId: AvatarId;
  userName: string;
  enableVideo: boolean;
  browserControlEnabled: boolean;
  userState: string;
  onAudioResponse: (base64?: string, aiText?: string) => Promise<void> | void;
  onTranscription: (text: string, finished?: boolean) => void;
  onTurnComplete: () => Promise<void> | void;
  onInterrupted: () => void;
  onRecordingStart: (sendInput: SendInput) => void;
  onStopRecording: () => void;
}) => Promise<void>;

type StopSession = (cleanup: () => void, userName?: string) => void;

type ExecuteAction = (action: ReturnType<typeof parseAssistantResponse>["actions"][number]) => Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}>;

interface SessionControllerArgs {
  avatarId: AvatarId;
  userName: string;
  cameraActive: boolean;
  browserControlEnabled: boolean;
  emotionEngineRef: RefObject<EmotionEngine>;
  isSpeaking: boolean;
  audioLevel: number;
  sendInputRef: RefObject<SendInput | null>;
  startSession: StartSession;
  stopSession: StopSession;
  sendTextMessage: (message: string) => void;
  playAudio: (base64: string) => void;
  stopAudio: () => void;
  startRecording: (onAudio: (audioBase64: string) => void) => void;
  stopRecording: () => void;
  setCurrentTranscript: (text: string) => void;
  addTurn: AddTurn;
  executeAction: ExecuteAction;
  runAgentTask: (task: string, sessionId: string, userId: string) => Promise<{ answer: string }>;
  stopVisionServices: () => void;
}

function summarizeFiles(data: Record<string, unknown> | undefined): { count: number; names: string } {
  const files = Array.isArray(data?.files) ? data.files as Array<{ name?: string }> : [];
  return {
    count: files.length,
    names: files.map((f) => f.name ?? "").filter(Boolean).join(", "),
  };
}

export function useSessionController({
  avatarId,
  userName,
  cameraActive,
  browserControlEnabled,
  emotionEngineRef,
  isSpeaking,
  audioLevel,
  sendInputRef,
  startSession,
  stopSession,
  sendTextMessage,
  playAudio,
  stopAudio,
  startRecording,
  stopRecording,
  setCurrentTranscript,
  addTurn,
  executeAction,
  runAgentTask,
  stopVisionServices,
}: SessionControllerArgs) {
  const handleStartSession = useCallback(async () => {
    const aiTextAccumulator: string[] = [];
    const userTranscriptParts: string[] = [];

    await startSession({
      avatarId,
      userName,
      enableVideo: cameraActive,
      browserControlEnabled,
      userState: emotionEngineRef.current.getSystemContext(),
      onAudioResponse: async (base64, aiText) => {
        if (base64) playAudio(base64);
        if (aiText) {
          console.log("🤖 [SessionController] Réponse IA reçue:", aiText);
          aiTextAccumulator.push(aiText);
        }
      },
      onTranscription: (text, finished) => {
        setCurrentTranscript(text);
        if (text.trim()) {
          userTranscriptParts.push(text);
        }

        if (finished && userName) {
          const fullText = userTranscriptParts.join(" ").trim();
          if (fullText) {
            console.log(`💾 Sauvegarde tour utilisateur (finished): "${fullText.slice(0, 60)}"`);
            addTurn(userName, "user", fullText);
          }
          userTranscriptParts.length = 0;
        }
      },
      onTurnComplete: async () => {
        if (userName && userTranscriptParts.length > 0) {
          const fullText = userTranscriptParts.join(" ").trim();
          if (fullText) {
            console.log(`💾 Sauvegarde tour utilisateur (turnComplete): "${fullText.slice(0, 60)}"`);
            addTurn(userName, "user", fullText);
          }
          userTranscriptParts.length = 0;
        }

        if (userName && aiTextAccumulator.length > 0) {
          const fullText = aiTextAccumulator.join("").trim();
          if (fullText) {
            console.log(`💾 Sauvegarde tour IA: "${fullText.slice(0, 60)}"`);
            addTurn(userName, "assistant", fullText);
          }

          if (fullText.toLowerCase().includes("tool:")) {
            const taskMatch = fullText.match(/tool:\s*(.*)/i);
            if (taskMatch?.[1]) {
              const task = taskMatch[1].trim();
              console.log(`🤖 [SessionController] Lancement de l'orchestrateur agentique avec la tâche: ${task}`);
              runAgentTask(task, `live-${Date.now()}`, userName)
                .then((result) => {
                  sendTextMessage(`[SYSTEM] L'agent a terminé la tâche demandée. Voici le résultat final : ${result.answer}. Informe brièvement l'utilisateur du succès.`);
                })
                .catch((err) => {
                  console.error("Erreur agent:", err);
                  sendTextMessage(`[SYSTEM] L'agent a échoué avec l'erreur: ${err.message || err}. Dis-le à l'utilisateur.`);
                });
            }
          }

          if (browserControlEnabled && fullText) {
            console.log("🌐 [SessionController] Contrôle du navigateur activé, analyse du texte complet...");
            const parsed = parseAssistantResponse(fullText);

            if (parsed.actions.length > 0) {
              console.log(`🎯 [SessionController] ${parsed.actions.length} commande(s) détectée(s)`);

              for (const action of parsed.actions) {
                try {
                  console.log("🚀 [SessionController] Exécution de:", action.type);
                  const result = await executeAction(action);
                  if (result.success) {
                    console.log(`✅ [SessionController] Commande ${action.type} exécutée avec succès`);

                    if (action.type === "pickWorkdir") {
                      sendTextMessage(`[SYSTEM] SUCCESS: Dossier sélectionné : ${result.data?.path}. Tu DOIS maintenant utiliser list_files pour voir son contenu.`);
                    } else if (action.type === "listDir") {
                      const files = summarizeFiles(result.data);
                      sendTextMessage(`[SYSTEM] SUCCESS: Résultats de list_files dans ${result.data?.path}.\nFichiers trouvés (${files.count}) : ${files.names || "Dossier vide"}\n\nACTION REQUIRED: Analyse cette liste et réponds vocalement à l'utilisateur maintenant.`);
                    } else if (action.type === "readFile") {
                      sendTextMessage(`[SYSTEM] Contenu de ${result.data?.path} :\n${result.data?.content}`);
                    } else if (action.type === "extract") {
                      sendTextMessage("[SYSTEM] Contenu de la page extrait avec succès.");
                    }
                  } else {
                    console.error(`❌ [SessionController] Échec de la commande ${action.type}:`, result.error);
                    sendTextMessage(`[SYSTEM] Erreur lors de l'action ${action.type} : ${result.error}`);
                  }
                } catch (error) {
                  console.error(`💥 [SessionController] Erreur lors de l'exécution de ${action.type}:`, error);
                }
              }
            } else {
              console.log("ℹ️ [SessionController] Aucune commande détectée dans le texte complet");
            }
          }

          aiTextAccumulator.length = 0;
        }
      },
      onInterrupted: () => {
        const threshold = isSpeaking ? 0.15 : 0.08;
        if (audioLevel > threshold) {
          console.log(`🗣️ Interruption détectée (${audioLevel.toFixed(2)} > ${threshold})`);
          stopAudio();
        } else {
          console.log(`🔇 Bruit ignoré (${audioLevel.toFixed(2)} <= ${threshold})`);
        }
      },
      onRecordingStart: (sendInput) => {
        sendInputRef.current = sendInput;
        startRecording((audioBase64) => sendInput(audioBase64, "audio"));
      },
      onStopRecording: () => {
        stopRecording();
        sendInputRef.current = null;
        stopVisionServices();
      },
    });
  }, [addTurn, audioLevel, avatarId, browserControlEnabled, cameraActive, emotionEngineRef, executeAction, isSpeaking, playAudio, runAgentTask, sendInputRef, sendTextMessage, setCurrentTranscript, startRecording, startSession, stopAudio, stopRecording, stopVisionServices, userName]);

  const handleStopSession = useCallback(() => {
    stopSession(() => {
      stopRecording();
      stopVisionServices();
    }, userName ?? undefined);
    stopAudio();
    sendInputRef.current = null;
  }, [sendInputRef, stopAudio, stopRecording, stopSession, stopVisionServices, userName]);

  return { handleStartSession, handleStopSession };
}

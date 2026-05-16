import { useState, useRef, useCallback } from "react";
import { buildSystemPrompt } from "../lib/systemPrompt";
import { AvatarId } from "../lib/avatarConfig";
import { retrieveRelevantContext } from "../lib/ragSearch";
import {
  loadAllSessions,
  getOrCreateCurrentSession,
} from "../lib/conversationMemory";
import {
  getOrGenerateCurrentWeekSummary,
  generateSessionSummary,
  formatWeeklySummaryForPrompt,
  loadWeeklySummaries,
} from "../lib/conversationSummary";

interface SessionOptions {
  avatarId: AvatarId;
  userName: string | null;
  onAudioResponse: (base64: string, aiText?: string) => void;
  onTranscription: (text: string, finished: boolean) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onFunctionCall?: (name: string, args: any) => void;
  onRecordingStart: (sendInput: (base64: string, type: 'audio' | 'video') => void) => void;
  onStopRecording: () => void;
  enableVideo?: boolean;
  browserControlEnabled?: boolean;
  userState?: string;
  currentWorkdir?: string | null;
}

export function useGeminiSession() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const sessionRef = useRef<any>(null);
  const isManualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const stopSession = useCallback(async (onStopRecording?: () => void, userName?: string) => {
    isManualStopRef.current = true;
    if (sessionRef.current) {
      try {
        if (window.neurochatElectron?.gemini) {
          window.neurochatElectron.gemini.disconnect();
          window.neurochatElectron.gemini.removeListener();
        } else if (sessionRef.current) {
          sessionRef.current.close();
        }
      } catch (e) {
        console.warn("Attempted to close an already closed session", e);
      }
      sessionRef.current = null;
    }
    if (onStopRecording) onStopRecording();
    setStatus("idle");

    // Fire-and-forget: generate session summary and refresh weekly summary
    if (userName) {
      const sessions = (await loadAllSessions()).filter((s) => s.userName === userName);
      const currentSession = sessions[sessions.length - 1];

      if (currentSession) {
        generateSessionSummary(currentSession, userName)
          .then(async (summary) => {
            if (summary) {
              // Persist summary back onto the session in localStorage
              const allSessions = await loadAllSessions();
              const idx = allSessions.findIndex((s) => s.id === currentSession.id);
              if (idx >= 0) {
                allSessions[idx].summary = summary;
                try {
                  // session save handled by conversation memory backend
                } catch { }
              }
              // Regenerate weekly summary with the new session data
              return getOrGenerateCurrentWeekSummary(
                (await loadAllSessions()).filter((s) => s.userName === userName),
                userName
              );
            }
          })
          .catch((err) =>
            console.warn("[Summary] Post-session summary failed:", err)
          );
      }
    }
  }, []);

  const startSession = useCallback(async (options: SessionOptions) => {
    const { avatarId, userName, onAudioResponse, onTranscription, onTurnComplete, onInterrupted, onFunctionCall, onRecordingStart, onStopRecording, enableVideo, browserControlEnabled, userState, currentWorkdir } = options;

    setStatus("connecting");
    setErrorMsg("");
    isManualStopRef.current = false;
    retryCountRef.current = 0;

    return new Promise<boolean>(async (resolve) => {
      const attemptConnection = async (): Promise<void> => {
        try {
          console.log("🚀 Démarrage de la session...");

          // Request microphone permission FIRST
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          stream.getTracks().forEach(track => track.stop());

          // ── RAG: retrieve semantically relevant context from full history ──
          let ragContext: string | undefined;
          let weeklySummary: string | undefined;

          if (userName) {
            // Run RAG retrieval and weekly summary fetch in parallel
            const [ragResult, weeklyResult] = await Promise.allSettled([
              retrieveRelevantContext(
                "résumé de nos conversations précédentes, sujets importants, préférences, code et projet",
                userName,
                currentWorkdir,
                6,
                0.55
              ),
              getOrGenerateCurrentWeekSummary(
                (await loadAllSessions()).filter((s) => s.userName === userName),
                userName
              ),
            ]);

            if (ragResult.status === "fulfilled" && ragResult.value.hasContext) {
              ragContext = ragResult.value.contextBlock;
              console.log(`🔍 RAG: ${ragResult.value.entries.length} entrées pertinentes injectées (Inclus Projet: ${!!currentWorkdir}).`);
            }

            if (weeklyResult.status === "fulfilled" && weeklyResult.value) {
              weeklySummary = formatWeeklySummaryForPrompt(weeklyResult.value);
              console.log(`📋 Synthèse hebdomadaire injectée (${weeklyResult.value.weekId}).`);
            }
          }

          const systemPromptText = buildSystemPrompt(avatarId, {
            userName: userName ?? undefined,
            ragContext,
            weeklySummary,
            browserControlEnabled,
            visionEnabled: enableVideo,
            userState,
            currentWorkdir,
          });

          if (!window.neurochatElectron?.gemini) {
             throw new Error("Electron IPC non disponible. Lancez l'application en mode Desktop.");
          }

          window.neurochatElectron.gemini.onEvent((eventData) => {
            switch(eventData.type) {
              case 'open':
                console.log("✅ Session ouverte ! (via Main Process)");
                setStatus("listening");
                retryCountRef.current = 0;
                onRecordingStart((base64Data: string, type: 'audio' | 'video' = 'audio') => {
                  if (type === 'audio') {
                    window.neurochatElectron!.gemini!.sendAudio(base64Data);
                  } else {
                    window.neurochatElectron!.gemini!.sendVideo(base64Data);
                  }
                });
                break;
              
              case 'inputTranscription':
                onTranscription(eventData.text, eventData.finished);
                break;
              
              case 'outputTranscription':
                onAudioResponse("", eventData.text);
                break;
              
              case 'audio':
                onAudioResponse(eventData.data, undefined);
                break;
              
              case 'turnComplete':
                console.log("✅ Tour IA terminé (turnComplete)");
                onTurnComplete();
                break;
              
              case 'functionCall':
                if (onFunctionCall && eventData.functionCall) {
                  onFunctionCall(eventData.functionCall.name, eventData.functionCall.args);
                }
                break;

              case 'interrupted':
                console.log("⚡ Interruption détectée");
                onInterrupted();
                break;
              
              case 'error':
                console.error("❌ Erreur de session (IPC):", eventData.error);
                setStatus("idle");
                if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
                  retryCountRef.current++;
                  console.log(`🔄 Tentative de reconnexion après erreur (${retryCountRef.current}/${maxRetries})...`);
                  setTimeout(() => attemptConnection(), 2000 * retryCountRef.current);
                } else {
                  setErrorMsg("Oups ! Une erreur de connexion s'est produite.");
                }
                break;
              
              case 'close':
                console.log("🚪 Session fermée (IPC)");
                setStatus("idle");
                onStopRecording();
                sessionRef.current = null;
                if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
                  retryCountRef.current++;
                  console.log(`🔄 Reconnexion automatique (${retryCountRef.current}/${maxRetries})...`);
                  setTimeout(() => attemptConnection(), 1500 * retryCountRef.current);
                }
                break;
            }
          });

          const connected = await window.neurochatElectron.gemini.connect(systemPromptText);
          if (!connected) {
             throw new Error("Impossible de se connecter à Gemini depuis le processus principal.");
          }

          // Fake session ref to bypass legacy checks
          sessionRef.current = { connected: true };
          retryCountRef.current = 0;
          resolve(true);
        } catch (err: any) {
          console.error("💥 Failed to start session:", err);
          if (err.name === "NotAllowedError") {
            setErrorMsg("Je n'ai pas la permission d'utiliser le microphone !");
            setStatus("idle");
            resolve(false);
          } else if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            setTimeout(() => attemptConnection(), 2000 * retryCountRef.current);
          } else {
            setErrorMsg(err.message || "Impossible de démarrer.");
            setStatus("idle");
            resolve(false);
          }
        }
      };

      await attemptConnection();
    });
  }, []);


  const sendTextMessage = useCallback((text: string) => {
    if (sessionRef.current && window.neurochatElectron?.gemini) {
      console.log(`📤 Envoi texte via IPC: "${text.slice(0, 50)}..."`);
      window.neurochatElectron.gemini.sendText(text);
    }
  }, []);

  const sendFunctionResponse = useCallback((name: string, response: any) => {
    if (sessionRef.current && window.neurochatElectron?.gemini) {
      console.log(`📤 Envoi functionResponse via IPC: ${name}`);
      window.neurochatElectron.gemini.sendFunctionResponse(name, response);
    }
  }, []);

  return { status, errorMsg, setErrorMsg, startSession, stopSession, sendTextMessage, sendFunctionResponse };
}

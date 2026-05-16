import { useState, useRef, useCallback } from "react";
import { buildSystemPromptAsync } from "../lib/systemPrompt";
import { AvatarId } from "../lib/avatarConfig";
import { retrieveRelevantContext } from "../lib/ragSearch";
import {
  loadAllSessions,
} from "../lib/conversationMemory";
import { formatWeeklySummaryForPrompt, generateSessionSummary, getOrGenerateCurrentWeekSummary } from "../lib/conversationSummary";
import type { ProactivityLevel } from "../runtime/RuntimeProvider";

interface SessionOptions {
  avatarId: AvatarId;
  userName: string | null;
  onAudioResponse: (base64: string, aiText?: string) => void;
  onTranscription: (text: string, finished: boolean) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onRecordingStart: (sendInput: (base64: string, type: 'audio' | 'video') => void) => void;
  onStopRecording: () => void;
  enableVideo?: boolean;
  browserControlEnabled?: boolean;
  userState?: string;
  proactivityLevel?: ProactivityLevel;
}

export function useGeminiSession() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const isManualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const stopSession = useCallback(async (onStopRecording?: () => void, userName?: string) => {
    isManualStopRef.current = true;
    
    if (window.neurochatElectron?.ai?.gemini) {
      window.neurochatElectron.ai.gemini.close();
      window.neurochatElectron.ai.gemini.removeAllListeners();
    }

    if (onStopRecording) onStopRecording();
    setStatus("idle");

    if (userName) {
      try {
        const sessions = (await loadAllSessions()).filter((s) => s.userName === userName);
        const currentSession = sessions[sessions.length - 1];

        if (currentSession) {
          const summary = await generateSessionSummary(currentSession, userName);
          if (summary) {
            await getOrGenerateCurrentWeekSummary(
              (await loadAllSessions()).filter((s) => s.userName === userName),
              userName
            );
          }
        }
      } catch (err) {
        console.warn("[Summary] Post-session summary failed:", err);
      }
    }
  }, []);

  const startSession = useCallback(async (options: SessionOptions) => {
    const { avatarId, userName, onAudioResponse, onTranscription, onTurnComplete, onInterrupted, onRecordingStart, onStopRecording, enableVideo, browserControlEnabled, userState, proactivityLevel } = options;

    if (!window.neurochatElectron?.ai?.gemini) {
      setErrorMsg("Environnement Electron non détecté ou bridge absent.");
      return false;
    }

    setStatus("connecting");
    setErrorMsg("");
    isManualStopRef.current = false;
    retryCountRef.current = 0;

    const gemini = window.neurochatElectron.ai.gemini;

    return new Promise<boolean>(async (resolve) => {
      const attemptConnection = async (): Promise<void> => {
        try {
          console.log("🚀 Démarrage de la session via bridge...");

          // Request microphone permission FIRST (renderer side)
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          stream.getTracks().forEach(track => track.stop());

          let ragContext: string | undefined;
          let weeklySummary: string | undefined;

          if (userName) {
            const [ragResult, weeklyResult] = await Promise.allSettled([
              retrieveRelevantContext(
                "résumé de nos conversations précédentes, sujets importants, préférences",
                userName,
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
            }

            if (weeklyResult.status === "fulfilled" && weeklyResult.value) {
              weeklySummary = formatWeeklySummaryForPrompt(weeklyResult.value);
            }
          }

          const systemPrompt = await buildSystemPromptAsync(avatarId, {
            userName: userName ?? undefined,
            ragContext,
            weeklySummary,
            browserControlEnabled,
            visionEnabled: enableVideo,
            userState,
            proactivityLevel,
          });

          // Configuration du bridge
          gemini.removeAllListeners();
          
          gemini.onopen(() => {
            console.log("✅ Session ouverte (bridge) !");
            setStatus("listening");
            retryCountRef.current = 0;
            onRecordingStart((base64Data: string, type: 'audio' | 'video' = 'audio') => {
              if (type === 'audio') {
                gemini.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                });
              } else {
                gemini.sendRealtimeInput({
                  video: { data: base64Data, mimeType: "image/jpeg" },
                });
              }
            });
            resolve(true);
          });

          gemini.onmessage((message: any) => {
            const serverContent = message.serverContent;
            const modelTurn = serverContent?.modelTurn;
            const parts = modelTurn?.parts;

            if (serverContent?.inputTranscription?.text) {
              onTranscription(serverContent.inputTranscription.text, serverContent.inputTranscription.finished ?? false);
            }

            const aiTranscriptText =
              serverContent?.outputTranscription?.text ??
              serverContent?.modelTurn?.transcription?.text ??
              null;

            if (aiTranscriptText) {
              onAudioResponse("", aiTranscriptText);
            }

            const base64Audio = parts?.find((p: any) => p.inlineData)?.inlineData?.data;
            if (base64Audio) {
              onAudioResponse(base64Audio, undefined);
            }

            if (serverContent?.turnComplete) {
              onTurnComplete();
            }

            if (serverContent?.interrupted) {
              onInterrupted();
            }
          });

          gemini.onerror((error: string) => {
            console.error("❌ Erreur bridge Gemini:", error);
            if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              setTimeout(() => attemptConnection(), 2000 * retryCountRef.current);
            } else {
              setErrorMsg("Oups ! Une erreur de connexion s'est produite.");
              setStatus("idle");
            }
          });

          gemini.onclose(() => {
            console.log("🚪 Session fermée (bridge)");
            setStatus("idle");
            onStopRecording();
            if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              setTimeout(() => attemptConnection(), 1500 * retryCountRef.current);
            }
          });

          const result = await gemini.connect({
            config: {
              systemInstruction: { parts: [{ text: systemPrompt }] },
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
              },
              outputAudioTranscription: {},
            },
          });

          if (!result.success) {
            throw new Error(result.error || "Échec de connexion bridge");
          }
        } catch (err: any) {
          console.error("💥 Failed to start session via bridge:", err);
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
    if (window.neurochatElectron?.ai?.gemini) {
      console.log(`📤 Envoi texte via bridge: "${text.slice(0, 50)}..."`);
      window.neurochatElectron.ai.gemini.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      });
    }
  }, []);

  return {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession,
    sendTextMessage
  };
}

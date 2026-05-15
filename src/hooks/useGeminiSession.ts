import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
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
  onToolCall?: (name: string, args: any) => void;
  onRecordingStart: (sendInput: (base64: string, type: 'audio' | 'video') => void) => void;
  onStopRecording: () => void;
  enableVideo?: boolean;
  browserControlEnabled?: boolean;
}

export function useGeminiSession() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const sessionRef = useRef<any>(null);
  const isManualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const stopSession = useCallback((onStopRecording?: () => void, userName?: string) => {
    isManualStopRef.current = true;
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Attempted to close an already closed session", e);
      }
      sessionRef.current = null;
    }
    if (onStopRecording) onStopRecording();
    setStatus("idle");

    // Fire-and-forget: generate session summary and refresh weekly summary
    if (userName) {
      const sessions = loadAllSessions().filter((s) => s.userName === userName);
      const currentSession = sessions[sessions.length - 1];

      if (currentSession) {
        generateSessionSummary(currentSession, userName)
          .then((summary) => {
            if (summary) {
              // Persist summary back onto the session in localStorage
              const allSessions = loadAllSessions();
              const idx = allSessions.findIndex((s) => s.id === currentSession.id);
              if (idx >= 0) {
                allSessions[idx].summary = summary;
                try {
                  localStorage.setItem(
                    "neurochat_v2_memory",
                    JSON.stringify(allSessions.slice(-50))
                  );
                } catch {}
              }
              // Regenerate weekly summary with the new session data
              return getOrGenerateCurrentWeekSummary(
                loadAllSessions().filter((s) => s.userName === userName),
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
    const { avatarId, userName, onAudioResponse, onTranscription, onTurnComplete, onInterrupted, onRecordingStart, onStopRecording, enableVideo, browserControlEnabled } = options;
    
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
              "résumé de nos conversations précédentes, sujets importants, préférences",
              userName,
              6,
              0.55
            ),
            getOrGenerateCurrentWeekSummary(
              loadAllSessions().filter((s) => s.userName === userName),
              userName
            ),
          ]);

          if (ragResult.status === "fulfilled" && ragResult.value.hasContext) {
            ragContext = ragResult.value.contextBlock;
            console.log(`🔍 RAG: ${ragResult.value.entries.length} entrées pertinentes injectées.`);
          }

          if (weeklyResult.status === "fulfilled" && weeklyResult.value) {
            weeklySummary = formatWeeklySummaryForPrompt(weeklyResult.value);
            console.log(`📋 Synthèse hebdomadaire injectée (${weeklyResult.value.weekId}).`);
          }
        }

        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        
        const session = await ai.live.connect({
          model: "gemini-2.0-flash-exp",
          callbacks: {
            onopen: () => {
              console.log("✅ Session ouverte !");
              setStatus("listening");
              retryCountRef.current = 0;
              onRecordingStart((base64Data: string, type: 'audio' | 'video' = 'audio') => {
                if (sessionRef.current) {
                  if (type === 'audio') {
                    sessionRef.current.sendRealtimeInput({
                      audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                    });
                  } else {
                    sessionRef.current.sendRealtimeInput({
                      video: { data: base64Data, mimeType: "image/jpeg" },
                    });
                  }
                }
              });
            },
            onmessage: (message: any) => {
              const serverContent = message.serverContent;
              if (serverContent) {
                console.log("📦 [Gemini RAW]", serverContent);
              }

              // ── TOOL CALL HANDLING ──
              const modelTurn = serverContent?.modelTurn;
              const toolCallPart = modelTurn?.parts?.find((p: any) => p.toolCall || p.functionCall);
              if (toolCallPart && options.onToolCall) {
                const toolCall = toolCallPart.toolCall || toolCallPart.functionCall;
                console.log("🛠️ [GeminiSession] Tool call reçu:", toolCall.name);
                options.onToolCall(toolCall.name, toolCall.args);
                
                // Répondre à l'outil immédiatement (requis par l'API)
                if (sessionRef.current) {
                  sessionRef.current.sendToolResponse({
                    functionResponses: [{
                      name: toolCall.name,
                      response: { result: "ok" },
                      id: toolCall.id
                    }]
                  });
                }
              }

              const parts = modelTurn?.parts;

              // Log COMPLET du message brut pour identifier la structure exacte
              if (serverContent?.inputTranscription || serverContent?.outputTranscription || serverContent?.turnComplete) {
                // console.log("📨 Message clé — structure complète:", JSON.stringify(message, (key, value) => {
                //   // Tronquer les données binaires (audio base64)
                //   if (key === 'data' && typeof value === 'string' && value.length > 100) return `[base64 ${value.length} chars]`;
                //   return value;
                // }, 2));
              }

              // Transcription utilisateur (entrée) — fragments accumulés dans App.tsx
              if (serverContent?.inputTranscription?.text) {
                const transcriptText = serverContent.inputTranscription.text;
                const isFinished = serverContent.inputTranscription.finished ?? false;
                // console.log(`📝 Transcription utilisateur: "${transcriptText}" (finished: ${isFinished})`);
                onTranscription(transcriptText, isFinished);
              }

              // Transcription IA (sortie) — plusieurs noms possibles selon la version du SDK
              const aiTranscriptText =
                serverContent?.outputTranscription?.text ??
                serverContent?.modelTurn?.transcription?.text ??
                null;

              if (aiTranscriptText) {
                // console.log(`🤖 Transcription IA: "${aiTranscriptText.slice(0, 80)}"`);
                onAudioResponse("", aiTranscriptText);
              }

              // Audio IA
              const base64Audio = parts?.find((p: any) => p.inlineData)?.inlineData?.data;
              if (base64Audio) {
                onAudioResponse(base64Audio, undefined);
              }

              if (serverContent?.turnComplete) {
                console.log("✅ Tour IA terminé (turnComplete)");
                onTurnComplete();
              }

              if (serverContent?.interrupted) {
                console.log("⚡ Interruption détectée");
                onInterrupted();
              }
            },
            onerror: (error: any) => {
              console.error("❌ Erreur de session:", error);
              setStatus("idle");
              if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`🔄 Tentative de reconnexion après erreur (${retryCountRef.current}/${maxRetries})...`);
                setTimeout(() => attemptConnection(), 2000 * retryCountRef.current);
              } else {
                setErrorMsg("Oups ! Une erreur de connexion s'est produite.");
              }
            },
            onclose: (event: any) => {
              console.log("🚪 Session fermée", event);
              setStatus("idle");
              onStopRecording();
              sessionRef.current = null;
              if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`🔄 Reconnexion automatique (${retryCountRef.current}/${maxRetries})...`);
                setTimeout(() => attemptConnection(), 1500 * retryCountRef.current);
              }
            }
          },
          config: {
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "render_ui",
                    description: "Affiche une interface visuelle (graphique, tableau ou carte) à l'utilisateur.",
                    parameters: {
                      type: "object" as any,
                      properties: {
                        type: { type: "string" as any, enum: ["bar-chart", "line-chart", "table", "stat-card"] },
                        title: { type: "string" as any },
                        description: { type: "string" as any },
                        labels: { type: "array" as any, items: { type: "string" as any } },
                        values: { type: "array" as any, items: { type: "number" as any } },
                        columns: { type: "array" as any, items: { type: "string" as any } },
                        rows: { type: "array" as any, items: { type: "array" as any, items: { type: "string" as any } } },
                        trend: { type: "number" as any }
                      },
                      required: ["type", "title"]
                    }
                  }
                ]
              }
            ],
            systemInstruction: {
              parts: [{
                text: buildSystemPrompt(avatarId, {
                  userName: userName ?? undefined,
                  ragContext,
                  weeklySummary,
                  browserControlEnabled,
                }),
              }],
            },
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
            // Active la transcription de la réponse IA pour la sauvegarder en mémoire
            outputAudioTranscription: {},
          },
        });

        sessionRef.current = session;
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

  return {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession
  };
}

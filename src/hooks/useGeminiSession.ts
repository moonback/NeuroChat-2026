import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { buildSystemPrompt } from "../lib/systemPrompt";
import { AvatarId } from "../lib/avatarConfig";

interface SessionOptions {
  avatarId: AvatarId;
  userName: string | null;
  onAudioResponse: (base64: string, aiText?: string) => void;
  onTranscription: (text: string, finished: boolean) => void;
  onInterrupted: () => void;
  onRecordingStart: (sendInput: (base64: string) => void) => void;
  onStopRecording: () => void;
}

export function useGeminiSession() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const sessionRef = useRef<any>(null);
  const isManualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const stopSession = useCallback((onStopRecording?: () => void) => {
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
  }, []);

  const startSession = useCallback(async (options: SessionOptions) => {
    const { avatarId, userName, onAudioResponse, onTranscription, onInterrupted, onRecordingStart, onStopRecording } = options;
    
    setStatus("connecting");
    setErrorMsg("");
    isManualStopRef.current = false;
    retryCountRef.current = 0;

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

        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        
        const session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          callbacks: {
            onopen: () => {
              console.log("✅ Session ouverte !");
              setStatus("listening");
              retryCountRef.current = 0;
              onRecordingStart((base64Data: string) => {
                if (sessionRef.current) {
                  sessionRef.current.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                  });
                }
              });
            },
            onmessage: (message: any) => {
              console.log("📨 Message reçu:", message);
              const serverContent = message.serverContent;
              const modelTurn = serverContent?.modelTurn;
              const parts = modelTurn?.parts;

              if (serverContent?.inputTranscription?.text) {
                onTranscription(serverContent.inputTranscription.text, serverContent.inputTranscription.finished);
              }

              const base64Audio = parts?.find((p: any) => p.inlineData)?.inlineData?.data;
              if (base64Audio) {
                const aiText = parts?.find((p: any) => p.text)?.text;
                onAudioResponse(base64Audio, aiText);
              }

              if (serverContent?.interrupted) {
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
            systemInstruction: { parts: [{ text: buildSystemPrompt(avatarId, { userName }) }] },
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
          },
        });

        sessionRef.current = session;
        retryCountRef.current = 0;
      } catch (err: any) {
        console.error("💥 Failed to start session:", err);
        if (err.name === "NotAllowedError") {
          setErrorMsg("Je n'ai pas la permission d'utiliser le microphone !");
          setStatus("idle");
        } else if (!isManualStopRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => attemptConnection(), 2000 * retryCountRef.current);
        } else {
          setErrorMsg(err.message || "Impossible de démarrer.");
          setStatus("idle");
        }
      }
    };

    await attemptConnection();
  }, []);

  return {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession
  };
}

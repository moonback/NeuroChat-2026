import { useState, useRef, useCallback } from "react";
import { chatWithOpenRouter, OpenRouterMessage } from "../lib/OpenRouterService";
import { buildSystemPromptAsync } from "../lib/systemPrompt";
import { AvatarId } from "../lib/avatarConfig";

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
}

type ConversationStatus = "idle" | "connecting" | "listening";

function selectFrenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.name.includes("Google") || voice.name.includes("French"));
}

export function useOpenRouterSession() {
  const [status, setStatusState] = useState<ConversationStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<any>(null);
  const conversationHistory = useRef<OpenRouterMessage[]>([]);
  const optionsRef = useRef<SessionOptions | null>(null);
  const statusRef = useRef<ConversationStatus>("idle");
  const manualStopRef = useRef(false);
  const isProcessingRef = useRef(false);

  const setStatus = useCallback((nextStatus: ConversationStatus) => {
    statusRef.current = nextStatus;
    setStatusState(nextStatus);
  }, []);

  const submitTextToOpenRouter = useCallback(async (text: string, shouldPublishTranscript: boolean) => {
    const options = optionsRef.current;
    const finalText = text.trim();
    if (!options || !finalText || isProcessingRef.current) return;

    if (shouldPublishTranscript) {
      options.onTranscription(finalText, true);
    }

    console.log("🗣️ [OpenRouter Fallback] User said:", finalText);
    conversationHistory.current.push({ role: "user", content: finalText });
    isProcessingRef.current = true;

    try {
      setStatus("connecting");
      const aiResponse = await chatWithOpenRouter(conversationHistory.current);
      conversationHistory.current.push({ role: "assistant", content: aiResponse });

      if (!manualStopRef.current) {
        setStatus("listening");
      }

      options.onAudioResponse("", aiResponse);

      const utterance = new SpeechSynthesisUtterance(aiResponse);
      utterance.lang = "fr-FR";
      const voice = selectFrenchVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);

      options.onTurnComplete();
    } catch (err: unknown) {
      console.error("OpenRouter fallback error:", err);
      setErrorMsg("Désolé, le service de secours a aussi échoué.");
      setStatus("idle");
    } finally {
      isProcessingRef.current = false;
    }
  }, [setStatus]);

  const stopSession = useCallback((onStopRecording?: () => void) => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    if (onStopRecording) onStopRecording();
    setStatus("idle");
  }, [setStatus]);

  const startSession = useCallback(async (options: SessionOptions) => {
    const { avatarId, userName, onTranscription, onRecordingStart, browserControlEnabled, enableVideo, userState } = options;

    manualStopRef.current = false;
    optionsRef.current = options;
    setStatus("listening");
    setErrorMsg("");

    // Initialize system prompt
    const systemPrompt = await buildSystemPromptAsync(avatarId, {
      userName: userName ?? undefined,
      browserControlEnabled,
      visionEnabled: enableVideo,
      userState
    });
    conversationHistory.current = [{ role: "system", content: systemPrompt }];

    // Initialize Web Speech API for STT
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("La reconnaissance vocale n'est pas supportée par ce navigateur.");
      setStatus("idle");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      onTranscription(currentText, !!finalTranscript);

      if (finalTranscript) {
        void submitTextToOpenRouter(finalTranscript, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return;
      setErrorMsg("Erreur de reconnaissance vocale.");
      setStatus("idle");
    };

    recognition.onend = () => {
      if (!manualStopRef.current && statusRef.current !== "idle") {
        try {
          recognition.start(); // Keep listening
        } catch (error) {
          console.warn("[OpenRouter Fallback] Failed to restart speech recognition:", error);
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Trigger recording start in App to show UI activity, even if we use browser STT
    onRecordingStart(() => {});
  }, [setStatus, submitTextToOpenRouter]);

  const sendTextMessage = useCallback((text: string) => {
    void submitTextToOpenRouter(text, false);
  }, [submitTextToOpenRouter]);

  return {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession,
    sendTextMessage
  };
}

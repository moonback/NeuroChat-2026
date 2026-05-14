import { useState, useRef, useCallback } from "react";
import { chatWithOpenRouter, OpenRouterMessage } from "../lib/OpenRouterService";
import { buildSystemPrompt } from "../lib/systemPrompt";
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
}

export function useOpenRouterSession() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<any>(null);
  const conversationHistory = useRef<OpenRouterMessage[]>([]);

  const stopSession = useCallback((onStopRecording?: () => void) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    if (onStopRecording) onStopRecording();
    setStatus("idle");
  }, []);

  const startSession = useCallback(async (options: SessionOptions) => {
    const { avatarId, userName, onAudioResponse, onTranscription, onTurnComplete, onRecordingStart, browserControlEnabled } = options;

    setStatus("listening");
    setErrorMsg("");

    // Initialize system prompt
    const systemPrompt = buildSystemPrompt(avatarId, { 
      userName: userName ?? undefined,
      browserControlEnabled
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
        console.log("🗣️ [OpenRouter Fallback] User said:", finalTranscript);
        conversationHistory.current.push({ role: "user", content: finalTranscript });
        
        try {
          setStatus("connecting"); // Show as processing
          const aiResponse = await chatWithOpenRouter(conversationHistory.current);
          conversationHistory.current.push({ role: "assistant", content: aiResponse });
          
          setStatus("listening");
          
          // Provide text response for transcription display
          onAudioResponse("", aiResponse);
          
          // Fallback TTS using browser API
          const utterance = new SpeechSynthesisUtterance(aiResponse);
          utterance.lang = 'fr-FR';
          
          // Try to find a nice voice
          const voices = window.speechSynthesis.getVoices();
          const puckVoice = voices.find(v => v.name.includes("Google") || v.name.includes("French"));
          if (puckVoice) utterance.voice = puckVoice;

          window.speechSynthesis.speak(utterance);
          
          onTurnComplete();
        } catch (err: any) {
          console.error("OpenRouter fallback error:", err);
          setErrorMsg("Désolé, le service de secours a aussi échoué.");
          setStatus("idle");
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') return;
      setErrorMsg("Erreur de reconnaissance vocale.");
      setStatus("idle");
    };

    recognition.onend = () => {
      if (status === "listening") {
        recognition.start(); // Keep listening
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Trigger recording start in App to show UI activity, even if we use browser STT
    onRecordingStart(() => {}); 
  }, [status]);

  return {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession
  };
}

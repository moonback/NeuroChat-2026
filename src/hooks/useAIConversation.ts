import { useState, useCallback, useRef } from "react";
import { useGeminiSession } from "./useGeminiSession";
import { useOpenRouterSession } from "./useOpenRouterSession";
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

export function useAIConversation() {
  const gemini = useGeminiSession();
  const openRouter = useOpenRouterSession();
  const [activeProvider, setActiveProvider] = useState<"gemini" | "openrouter">("gemini");
  const optionsRef = useRef<SessionOptions | null>(null);

  const startSession = useCallback(async (options: SessionOptions) => {
    optionsRef.current = options;
    setActiveProvider("gemini");
    
    const success = await gemini.startSession(options);
    if (!success) {
      console.warn("Gemini failed to start, switching to OpenRouter fallback...");
      setActiveProvider("openrouter");
      await openRouter.startSession(options);
    }
  }, [gemini, openRouter]);

  const stopSession = useCallback((onStopRecording?: () => void, userName?: string) => {
    if (activeProvider === "gemini") {
      gemini.stopSession(onStopRecording, userName);
    } else {
      openRouter.stopSession(onStopRecording);
    }
  }, [activeProvider, gemini, openRouter]);

  // If gemini enters an error state that isn't permission-related, try switching to OpenRouter
  // This is tricky because we need to detect the error from the hook.
  
  // For now, let's just expose the active one's properties
  const current = activeProvider === "gemini" ? gemini : openRouter;

  return {
    ...current,
    activeProvider,
    startSession,
    stopSession,
  };
}

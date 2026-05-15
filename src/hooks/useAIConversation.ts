import { useState, useCallback, useRef } from "react";
import { useGeminiSession } from "./useGeminiSession";
import { useOpenRouterSession } from "./useOpenRouterSession";
import { AvatarId } from "../lib/avatarConfig";
import { getAgentService } from "../lib/agent/service";
import type { AgentRunOptions, AgentRunResult, AgentEvent } from "../lib/agent/types";

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

function shouldAutoRunAgent(text: string): boolean {
  const t = text.toLowerCase();
  return t.startsWith("tool:") || t.includes("utilise un outil") || t.includes("ouvre le navigateur") || t.includes("cherche dans ma mémoire");
}

export function useAIConversation() {
  const gemini = useGeminiSession();
  const openRouter = useOpenRouterSession();
  const [activeProvider, setActiveProvider] = useState<"gemini" | "openrouter">("gemini");
  const optionsRef = useRef<SessionOptions | null>(null);

  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);

  const runAgentTask = useCallback(async (
    input: string,
    sessionId: string,
    userId: string,
    options?: AgentRunOptions,
  ): Promise<AgentRunResult> => {
    const service = getAgentService();
    setAgentEvents([]); // reset on new task
    
    const mergedOptions: AgentRunOptions = {
      ...options,
      onEvent: (event) => {
        setAgentEvents(prev => [...prev, event]);
        options?.onEvent?.(event);
      }
    };
    
    return service.run({ input, sessionId, userId, options: mergedOptions });
  }, []);

  const processUserText = useCallback(async (text: string, sessionId: string, userId: string) => {
    if (!shouldAutoRunAgent(text)) return null;
    return runAgentTask(text, sessionId, userId, { maxIterations: 6 });
  }, [runAgentTask]);

  const startSession = useCallback(async (options: SessionOptions) => {
    optionsRef.current = options;
    setActiveProvider("gemini");

    const enhancedOptions: SessionOptions = {
      ...options,
      onTranscription: (text, finished) => {
        options.onTranscription(text, finished);
      },
    };

    const success = await gemini.startSession(enhancedOptions);
    if (!success) {
      console.warn("Gemini failed to start, switching to OpenRouter fallback...");
      setActiveProvider("openrouter");
      await openRouter.startSession(enhancedOptions);
    }
  }, [gemini, openRouter, processUserText]);

  const stopSession = useCallback((onStopRecording?: () => void, userName?: string) => {
    if (activeProvider === "gemini") {
      gemini.stopSession(onStopRecording, userName);
    } else {
      openRouter.stopSession(onStopRecording);
    }
  }, [activeProvider, gemini, openRouter]);

  const current = activeProvider === "gemini" ? gemini : openRouter;

  const sendTextMessage = useCallback((text: string) => {
    if (activeProvider === "gemini") {
      gemini.sendTextMessage(text);
    }
  }, [activeProvider, gemini]);

  return {
    ...current,
    activeProvider,
    startSession,
    stopSession,
    sendTextMessage,
    runAgentTask,
    shouldAutoRunAgent,
    processUserText,
    agentEvents,
  };
}

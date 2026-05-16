import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useRef, useState, useEffect } from "react";
import { EmotionEngine } from "../lib/EmotionEngine";
import type { AvatarId } from "../lib/avatarConfig";

export type ProactivityLevel = "quiet" | "coach" | "companion" | "jarvis";

export interface ToolCallRequest {
  id: string;
  skillName: string;
  arguments: any;
  resolve: (approved: boolean) => void;
}

interface RuntimeContextValue {
  avatarId: AvatarId;
  setAvatarId: Dispatch<SetStateAction<AvatarId>>;
  currentTranscript: string;
  setCurrentTranscript: Dispatch<SetStateAction<string>>;
  showDatabase: boolean;
  setShowDatabase: Dispatch<SetStateAction<boolean>>;
  pipExpanded: boolean;
  setPipExpanded: Dispatch<SetStateAction<boolean>>;
  isPrivate: boolean;
  setIsPrivate: Dispatch<SetStateAction<boolean>>;
  proactivityLevel: ProactivityLevel;
  setProactivityLevel: Dispatch<SetStateAction<ProactivityLevel>>;
  pendingToolCall: ToolCallRequest | null;
  requestToolConfirmation: (skillName: string, args: any) => Promise<boolean>;
  setPendingToolCall: Dispatch<SetStateAction<ToolCallRequest | null>>;
  emotionEngineRef: RefObject<EmotionEngine>;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [avatarId, setAvatarId] = useState<AvatarId>("robot");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showDatabase, setShowDatabase] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [proactivityLevel, setProactivityLevel] = useState<ProactivityLevel>("companion");
  const [pendingToolCall, setPendingToolCall] = useState<ToolCallRequest | null>(null);

  const requestToolConfirmation = (skillName: string, args: any): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingToolCall({
        id: Math.random().toString(36).slice(2, 9),
        skillName,
        arguments: args,
        resolve
      });
    });
  };

  // Load preferences
  useEffect(() => {
    if (window.neurochatElectron?.db) {
      window.neurochatElectron.db.get('proactivityLevel').then((saved: any) => {
        if (saved) setProactivityLevel(saved as ProactivityLevel);
      });
    }
  }, []);

  // Save preferences
  useEffect(() => {
    if (window.neurochatElectron?.db) {
      window.neurochatElectron.db.set('proactivityLevel', proactivityLevel);
    }
  }, [proactivityLevel]);

  const emotionEngineRef = useRef(new EmotionEngine());

  return (
    <RuntimeContext.Provider
      value={{
        avatarId,
        setAvatarId,
        currentTranscript,
        setCurrentTranscript,
        showDatabase,
        setShowDatabase,
        pipExpanded,
        setPipExpanded,
        isPrivate,
        setIsPrivate,
        proactivityLevel,
        setProactivityLevel,
        pendingToolCall,
        requestToolConfirmation,
        setPendingToolCall,
        emotionEngineRef,
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime must be used within RuntimeProvider");
  }
  return context;
}

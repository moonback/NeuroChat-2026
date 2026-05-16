import { createContext, type Dispatch, type ReactNode, type RefObject, type SetStateAction, useContext, useRef, useState } from "react";

import { EmotionEngine } from "../lib/EmotionEngine";
import type { AvatarId } from "../lib/avatarConfig";

interface RuntimeContextValue {
  avatarId: AvatarId;
  setAvatarId: Dispatch<SetStateAction<AvatarId>>;
  currentTranscript: string;
  setCurrentTranscript: Dispatch<SetStateAction<string>>;
  showDatabase: boolean;
  setShowDatabase: Dispatch<SetStateAction<boolean>>;
  pipExpanded: boolean;
  setPipExpanded: Dispatch<SetStateAction<boolean>>;
  emotionEngineRef: RefObject<EmotionEngine>;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [avatarId, setAvatarId] = useState<AvatarId>("robot");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showDatabase, setShowDatabase] = useState(false);
  const [pipExpanded, setPipExpanded] = useState(false);
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

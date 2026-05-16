/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    neurochatElectron?: {
      isElectron: boolean;
      fs: {
        listDir: (path: string) => Promise<any[]>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<boolean>;
        deleteItem: (path: string) => Promise<boolean>;
        mkdir: (path: string) => Promise<boolean>;
        exists: (path: string) => Promise<boolean>;
        getStats: (path: string) => Promise<any>;
      };
      dialog: {
        showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      };
      db?: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        loadVectors: (userName?: string) => Promise<any[]>;
        addVector: (entry: any) => Promise<boolean>;
        saveVectors: (entries: any[]) => Promise<boolean>;
        clearVectors: (userName?: string) => Promise<boolean>;
        loadSessions: () => Promise<any[]>;
        saveSessions: (sessions: any[]) => Promise<boolean>;
        clearSessions: () => Promise<boolean>;
        getProfile: (userName: string) => Promise<any | null>;
        setProfile: (profile: any) => Promise<boolean>;
        loadLearning: (userId: string) => Promise<string | null>;
        saveLearning: (userId: string, encryptedData: string, lastUpdated: number) => Promise<boolean>;
        clearLearning: (userId: string) => Promise<boolean>;
        loadSummaries: () => Promise<any[]>;
        saveSummary: (summary: any) => Promise<boolean>;
        clearSummaries: () => Promise<boolean>;
        saveTrace: (trace: any) => Promise<boolean>;
        loadTraces: () => Promise<any[]>;
        clearTraces: () => Promise<boolean>;
        migrate: (payload: any) => Promise<boolean>;
      };
      gemini?: {
        connect: (prompt: string) => Promise<boolean>;
        disconnect: () => Promise<boolean>;
        sendAudio: (base64: string) => void;
        sendVideo: (base64: string) => void;
        sendText: (text: string) => void;
        sendFunctionResponse: (name: string, response: any) => void;
        analyzeStagnation: (payload: { base64: string, source: "camera" | "screen" }) => Promise<{ isStagnant: boolean, context?: string }>;
        onEvent: (callback: (data: any) => void) => void;
        removeListener: () => void;
      };
    };
  }
}

export {};

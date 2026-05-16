/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
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
      ai?: {
        chatWithOpenRouter: (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => Promise<string>;
        completeOpenRouterStepWithTools: (prompt: string, tools: Array<{ name: string; description: string; parameters: object }>) => Promise<{ name?: string; arguments?: string; finalAnswer?: string }>;
        gemini?: {
          connect: (config: any) => Promise<{ success: boolean; error?: string }>;
          sendRealtimeInput: (input: any) => void;
          sendClientContent: (content: any) => void;
          close: () => void;
          onopen: (callback: () => void) => void;
          onmessage: (callback: (message: any) => void) => void;
          onerror: (callback: (error: string) => void) => void;
          onclose: (callback: (event: any) => void) => void;
          removeAllListeners: () => void;
        };
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
    };
  }
}

export {};

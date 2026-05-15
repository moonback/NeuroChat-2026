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
      };
    };
  }
}

export {};

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // Ajoutez d'autres variables d'environnement ici si nécessaire
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    /** Présent uniquement dans la fenêtre Electron (voir `electron/preload.cjs`). */
    neurochatElectron?: {
      isElectron: boolean;
      db?: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        loadVectors: (userName?: string) => Promise<any[]>;
        addVector: (entry: any) => Promise<boolean>;
        clearVectors: (userName?: string) => Promise<boolean>;
      };
    };
  }
}

export {};

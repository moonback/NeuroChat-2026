/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // Ajoutez d'autres variables d'environnement ici si nécessaire
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

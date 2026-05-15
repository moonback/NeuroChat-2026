import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  /** Relative base is required when Electron loads `dist/index.html` via `file://`. */
  const electronBuild = process.env.ELECTRON === 'true';
  return {
    base: electronBuild ? './' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      // VITE_DISABLE_HMR=true avoids the dev WebSocket entirely if you see handshake 400 (some proxies / previews).
      hmr:
        process.env.DISABLE_HMR === 'true' || process.env.VITE_DISABLE_HMR === 'true'
          ? false
          : {
              protocol: 'ws',
              host: 'localhost',
              port: 3000,
            },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

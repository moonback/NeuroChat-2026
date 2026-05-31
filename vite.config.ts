import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function splitVendorChunk(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/');
  if (!normalizedId.includes('node_modules')) return undefined;
  if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) return 'react-vendor';
  if (normalizedId.includes('/motion/')) return 'motion-vendor';
  if (normalizedId.includes('/lucide-react/') || normalizedId.includes('/lucide/')) return 'icons-vendor';
  if (normalizedId.includes('/@google/genai/')) return 'ai-vendor';
  if (normalizedId.includes('/onnxruntime-web/')) return 'onnx-vendor';
  if (normalizedId.includes('/@xenova/transformers/')) return 'transformers-vendor';
  return undefined;
}

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
    worker: {
      // Embedding workers dynamically import Transformers/ONNX, so they need an ES
      // module worker bundle to allow Rollup code-splitting inside the worker graph.
      format: 'es',
      rollupOptions: {
        output: {
          manualChunks: splitVendorChunk,
        },
      },
    },
    build: {
      // The lazily imported onnxruntime backend is a single minified module and remains
      // just over Vite's default 500 kB advisory threshold after being split out.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: splitVendorChunk,
        },
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tauri': ['@tauri-apps/api/core', '@tauri-apps/api/event', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs'],
          'vendor-codemirror': [
            '@codemirror/state',
            '@codemirror/view', 
            '@codemirror/commands',
            '@codemirror/language',
            '@codemirror/lint',
            '@codemirror/lang-python',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@lezer/highlight'
          ],
          'vendor-lucide': ['lucide-react'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));

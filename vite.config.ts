import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { matchpoyntTheme } from './src/utils/theme/vitePlugin.ts'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
// Kept compatible with `pnpm tauri dev`: fixed port, strictPort, no screen clearing.
export default defineConfig({
  plugins: [react(), tailwindcss(), matchpoyntTheme()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**', '**/server/**'] },
    // Dev counterpart of the nginx proxy: same-origin /api, so cookies and CORS just work.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
  build: {
    // Tauri webviews: Chromium on Windows, WebKit on macOS/Linux.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})

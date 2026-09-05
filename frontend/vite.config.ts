import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const rootDir = import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Reliable Fresh — Export Management',
        short_name: 'Reliable Fresh',
        description: 'Internal export management system for Reliable Fresh grape exports',
        theme_color: '#0F5C37',
        background_color: '#F1F4F1',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // App requires a live connection for all data submission; only
        // precache the app shell so navigation works, never cache API calls.
        navigateFallbackDenylist: [/^\/api\//],
        // Workbox's default glob omits woff2 and webp. Without these two
        // added, the self-hosted Inter file is fetched from the network on
        // every cold start — which is the exact thing self-hosting was
        // meant to avoid on weak rural connections — and the login
        // background is re-downloaded each time.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

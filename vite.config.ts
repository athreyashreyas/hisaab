import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Hisaab PWA. Auto-update flow mirrors the suite: workbox registers a new SW,
// main.tsx listens for it and dispatches `hisaab:updating` for a graceful reload.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // main.tsx owns registration for the custom update UX
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Hisaab',
        short_name: 'Hisaab',
        description: 'An honest reckoning of where your money goes.',
        theme_color: '#1E7F75',
        background_color: '#FAF9F6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});

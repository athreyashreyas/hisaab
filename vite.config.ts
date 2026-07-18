import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

// Hisaab PWA. Auto-update flow mirrors the suite: workbox registers a new SW,
// main.tsx listens for it and dispatches `hisaab:updating` for a graceful reload.
// The Sync button can also force an update to land (see lib/appUpdate.ts), which
// is what BUILD_ID and version.json below are for.

// Identifies the deployed build. Vercel exposes the commit SHA at build time; a
// local build gets a timestamp so `dev` never looks stale to itself.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

/**
 * Emit a tiny version.json next to the bundle so a running tab can ask "is the
 * server ahead of me?" without trusting the service worker to admit it. Note it
 * is NOT matched by the workbox globPatterns below (no .json), so it never gets
 * precached and always reflects the live deploy.
 */
function versionManifest(): Plugin {
  return {
    name: 'hisaab-version-manifest',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ build: BUILD_ID, version: pkg.version }),
      });
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    versionManifest(),
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
  build: {
    // Split big, independently-cached vendors into their own chunks so the app
    // shell isn't one monolith: the boot path pulls only react + its core deps,
    // while recharts (charts) and framer-motion (animation) load in parallel /
    // on demand and stay cached across deploys that don't touch them.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-data': ['@supabase/supabase-js', 'dexie', '@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
          'vendor-dates': ['date-fns'],
        },
      },
    },
  },
});

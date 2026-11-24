import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // GitHub Pages project sites live under /<repo>/. The Pages workflow sets
  // VITE_BASE_PATH; local dev and the AWS deployment use the root.
  const env = loadEnv(mode, '.', 'VITE_');
  const rawBase = (env.VITE_BASE_PATH || '/').trim();
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'My Workspace — Notes',
          short_name: 'Workspace',
          description:
            'Offline-first notes with tags, checklists, images, code, links and lists.',
          theme_color: '#0b1320',
          background_color: '#0b1320',
          display: 'standalone',
          orientation: 'any',
          categories: ['productivity', 'utilities'],
          icons: [
            {
              src: `${base}icons/pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `${base}icons/pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: `${base}icons/maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
        },
      }),
    ],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff,woff2,txt}'] },
      manifest: {
        name: 'Mono Cromat · Preapertura',
        short_name: 'Mono Cromat',
        description: 'Tu espacio de trabajo para preparar tus marcas.',
        lang: 'es',
        start_url: '/',
        theme_color: '#2e48a1',
        background_color: '#e9f0f3',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})

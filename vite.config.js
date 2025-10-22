import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-192.png', 'pwa-512.png', 'vite.svg'],
      manifest: {
        screenshots: [
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide' },
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', form_factor: 'narrow' }
        ],
        name: 'Weather App',
        short_name: 'Weather',
        description:
          'Search weather by city with a fast, offline-ready PWA. Dark mode, dynamic backgrounds, and live temperature colors.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Weather API: serve cached immediately, refresh in background
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Geocoding API
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'geocoding-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})

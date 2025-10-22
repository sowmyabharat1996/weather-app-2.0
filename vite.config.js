import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'app-192.png', 'app-512.png', 'vite.svg'],
      manifest: {
        // Use ≥320px images as “screenshots” (not icons)
        screenshots: [
          // wide or portrait preview – use your 512 as a placeholder if you don’t have a real UI shot yet
          { src: '/app-512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide' },
          // add another ≥320 asset (you can duplicate for now)
          { src: '/app-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow' }
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
          // normal (any) icons
          { src: '/app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // separate maskable icon
          { src: '/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
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

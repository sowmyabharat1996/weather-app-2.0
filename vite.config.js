import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "Weather 2.0",
        short_name: "Weather",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0ea5e9",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          // Cache your API calls with a network-first strategy
          {
            urlPattern: ({ url }) =>
              url.origin === "https://api.open-meteo.com" ||
              url.origin === "https://geocoding-api.open-meteo.com",
            handler: "NetworkFirst",
            options: {
              cacheName: "weather-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Images / icons
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "images", expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
});

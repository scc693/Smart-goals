import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Gamified Goal Tracker',
        short_name: 'GoalTracker',
        description: 'Track your goals with gamification and offline support',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Order matters: match more specific packages before broader fallbacks.
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-auth'
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'vendor-firebase-firestore'
            if (id.includes('firebase/app') || id.includes('@firebase/app')) return 'vendor-firebase-app'
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            if (id.includes('react-dom') || id.includes('react')) return 'vendor-react'
            return 'vendor'
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

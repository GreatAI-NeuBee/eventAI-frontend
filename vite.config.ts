import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw-custom.js',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EventBuddy - Live Event Management',
        short_name: 'EventBuddy',
        description: 'Real-time event congestion monitoring and management system',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/google': {
        target: 'https://maps.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/google/, ''),
        timeout: 60000, // 60 seconds timeout
        proxyTimeout: 60000
      }
    }
  },
  build: {
    minify: 'terser',
    // Cast to any for typescript used
    terserOptions: {
      compress: {
        drop_console: true,
      },
    } as any,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@aws-sdk/client-s3', '@aws-sdk/client-comprehend', '@aws-sdk/lib-storage']
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    // Cast to any for typescript used
    terserOptions: {
      compress: {
        drop_console: true,
      },
    } as any,
  },
})

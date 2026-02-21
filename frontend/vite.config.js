import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-i18next': fileURLToPath(new URL('./src/i18n/noopReactI18next.js', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // API so'rovlarni backendga uzatamiz.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

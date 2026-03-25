import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function isNodeModulePackage(id, pkg) {
  return id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (
              isNodeModulePackage(id, 'react') ||
              isNodeModulePackage(id, 'react-dom') ||
              isNodeModulePackage(id, 'react-router') ||
              isNodeModulePackage(id, 'react-router-dom')
            ) {
              return 'react-vendor';
            }

            if (
              isNodeModulePackage(id, '@reduxjs/toolkit') ||
              isNodeModulePackage(id, 'react-redux')
            ) {
              return 'state-vendor';
            }

            if (
              isNodeModulePackage(id, 'i18next') ||
              isNodeModulePackage(id, 'react-i18next') ||
              isNodeModulePackage(id, 'i18next-browser-languagedetector')
            ) {
              return 'i18n-vendor';
            }

            if (
              isNodeModulePackage(id, 'axios') ||
              isNodeModulePackage(id, 'react-toastify')
            ) {
              return 'app-vendor';
            }

            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        // API so'rovlarni backendga uzatamiz.
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

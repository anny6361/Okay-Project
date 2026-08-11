import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      // Completely disable HMR in development/preview to prevent any WebSocket connection errors in client browser console
      hmr: false,
      // Disable file watching to save server-side resources
      watch: null,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('exceljs') || id.includes('jszip')) {
                return 'vendor-excel';
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) {
                return 'vendor-pdf';
              }
              return 'vendor-core';
            }
          }
        }
      }
    }
  };
});

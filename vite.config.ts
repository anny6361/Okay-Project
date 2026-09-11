import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Narrow build-time compatibility patch for the OCR error handler.
// The source currently has a fallback that can read a Response body twice.
function ocrResponseBodyFix() {
  const newBlock = `    let errMessage = \`Server returned \${response.status}\`;

    try {
      const responseBody = await response.text();

      if (responseBody) {
        try {
          const errJson = JSON.parse(responseBody);
          if (errJson && errJson.error) {
            errMessage = String(errJson.error);
          } else {
            errMessage = responseBody;
          }
        } catch {
          errMessage = responseBody;
        }
      }
    } catch {
      // Keep HTTP status message
    }
    throw new Error(errMessage);`;

  return {
    name: 'ocr-response-body-fix',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/components/MyRequestsView.tsx')) {
        return null;
      }

      if (code.includes(newBlock)) {
        return null;
      }

      const ocrHandlerPattern = /    let errMessage = `Server returned \\${response\\.status}`;[\\s\\S]*?    throw new Error\\(errMessage\\);/;
      if (!ocrHandlerPattern.test(code)) {
        return null;
      }

      return {
        code: code.replace(ocrHandlerPattern, newBlock),
        map: null,
      };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [ocrResponseBodyFix(), react(), tailwindcss()],
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

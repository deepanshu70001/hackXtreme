import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const runAnywhereWasmFiles = ['racommons-llamacpp.wasm', 'racommons-llamacpp-webgpu.wasm'] as const;

const copyRunAnywhereWasmPlugin = () => {
  let outputDir = path.resolve(__dirname, 'dist');

  return {
    name: 'copy-runanywhere-wasm',
    apply: 'build' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outputDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const sourceDir = path.resolve(__dirname, '..', 'node_modules', '@runanywhere', 'web-llamacpp', 'wasm');
      const targetAssetsDir = path.resolve(outputDir, 'assets');

      fs.mkdirSync(targetAssetsDir, { recursive: true });

      for (const fileName of runAnywhereWasmFiles) {
        const sourceFile = path.resolve(sourceDir, fileName);
        const targetFile = path.resolve(targetAssetsDir, fileName);

        if (!fs.existsSync(sourceFile)) {
          throw new Error(`Missing RunAnywhere WASM file in node_modules: ${sourceFile}`);
        }

        fs.copyFileSync(sourceFile, targetFile);
      }
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), copyRunAnywhereWasmPlugin()],
  assetsInclude: ['**/*.wasm'],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@runanywhere/web') || id.includes('@runanywhere/web-llamacpp')) {
            return 'runanywhere';
          }
          if (id.includes('pdfjs-dist')) {
            return 'pdf';
          }
          if (id.includes('tesseract.js')) {
            return 'ocr';
          }
          if (id.includes('react') || id.includes('zustand') || id.includes('motion')) {
            return 'framework';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@runanywhere/web', '@runanywhere/web-llamacpp'],
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});

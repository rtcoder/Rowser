import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, 'public'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../../dist/firefox'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        viewer: resolve(__dirname, 'viewer.html'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});

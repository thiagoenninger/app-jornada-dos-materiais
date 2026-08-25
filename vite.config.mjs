import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'apps',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        //tablet: resolve(dirname, 'apps/tablet.html'),
        screen: resolve(dirname, 'apps/screen.html')
      }
    }
  }
});
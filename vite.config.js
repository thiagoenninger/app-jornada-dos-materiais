import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolver} from 'path';

export default defineConfig ({
    root: 'apps',
    plugins: [react()],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                tablet: resolve(__dirname, 'apps/tablet.html'),
                screen: resolve(__dirname, 'app/screen.html')
            }
        }
    }
})
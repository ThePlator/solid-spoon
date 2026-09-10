import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    // MV3-friendly output
    target: 'esnext',
    rollupOptions: { input: { popup: 'src/popup.html' } },
  },
});

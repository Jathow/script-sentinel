import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      entry: 'electron/main.ts',
      onstart({ startup }) {
        startup();
      },
      vite: {
        build: { outDir: 'dist-electron', sourcemap: true },
      },
    }),
    electron({
      entry: 'electron/preload.ts',
      onstart({ reload }) {
        reload();
      },
      vite: {
        build: { outDir: 'dist-electron', sourcemap: true },
      },
    }),
    renderer(),
  ],
  build: {
    sourcemap: true,
  },
});



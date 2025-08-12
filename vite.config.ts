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
        build: {
          outDir: 'dist-electron',
          sourcemap: true,
          rollupOptions: {
            output: {
              format: 'esm',
              entryFileNames: 'main.mjs',
            },
          },
        },
      },
    }),
    electron({
      entry: 'electron/preload.ts',
      onstart({ reload }) {
        reload();
      },
      vite: {
        build: {
          outDir: 'dist-electron',
          sourcemap: true,
          target: 'node20',
          // Force library build in true CommonJS to avoid ESM syntax in .cjs output
          lib: {
            entry: 'electron/preload.ts',
            formats: ['cjs'],
            fileName: () => 'preload',
          },
          rollupOptions: {
            external: ['electron'],
            output: {
              format: 'cjs',
              exports: 'auto',
              entryFileNames: 'preload.cjs',
            },
          },
        },
        esbuild: {
          platform: 'node',
          // Allow Rollup to handle CJS generation
        },
      },
    }),
    renderer(),
  ],
  build: {
    sourcemap: true,
  },
});



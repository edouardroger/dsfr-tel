/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

const EXTERNAL_LIBPHONENUMBER = /^libphonenumber-js(\/(max|min|mobile|core))?$/;

/** Remplace les métadonnées « max » par « mobile ». */
function mobileMetadata(): Plugin {
  return {
    name: 'dsfr-tel:mobile-metadata',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'libphonenumber-js/max') {
        return { id: 'libphonenumber-js/mobile', external: true };
      }
      return null;
    }
  };
}

// vite build               → librairie (dist/)
// vite build --mode mobile → variante mobile (dist/mobile/)
// vite build --mode demo   → démonstration (dist-demo/)
export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo';
  const isMobile = mode === 'mobile';

  return {
    base: isDemo ? process.env.BASE_PATH ?? './' : '/',
    root: isDemo ? 'demo' : process.cwd(),
    plugins: [
      vue(),
      ...(isMobile ? [mobileMetadata()] : []),
      ...(isDemo || isMobile
        ? []
        : [dts({
            include: ['src/**/*.ts', 'src/**/*.vue'],
            exclude: ['src/**/*.spec.ts'],
            outDir: 'dist/types',
            rollupTypes: false
          })])
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    build: isDemo
      ? {
          outDir: '../dist-demo',
          emptyOutDir: true,
          target: 'es2020',
          sourcemap: false
        }
      : {
          target: 'es2020',
          sourcemap: true,
          cssCodeSplit: false,
          outDir: isMobile ? 'dist/mobile' : 'dist',
          lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: 'DsfrTel',
            formats: ['es', 'umd'],
            fileName: (format) => (format === 'es' ? 'dsfr-tel.es.mjs' : 'dsfr-tel.umd.js')
          },
          rollupOptions: {
            // Variante mobile : « /max » doit rester résolu par le plugin mobileMetadata.
            external: (id) =>
              id === 'vue' ||
              (EXTERNAL_LIBPHONENUMBER.test(id) && !(isMobile && id === 'libphonenumber-js/max')),
            output: {
              exports: 'named',
              name: 'DsfrTel',
              globals: {
                vue: 'Vue',
                'libphonenumber-js/max': 'libphonenumber',
                'libphonenumber-js/mobile': 'libphonenumber'
              },
              assetFileNames: (asset) =>
                asset.names?.[0]?.endsWith('.css') ? 'dsfr-tel.css' : '[name][extname]'
            }
          }
        },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.spec.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/*.spec.ts'],
        thresholds: { statements: 80, branches: 70, functions: 85, lines: 85 }
      }
    }
  };
});

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from 'vite-plugin-dts';
import { resolve } from "path";
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [vue(),
  dts({
    outDir: 'dist/types',
    insertTypesEntry: true,
  }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "DsfrTel",
      fileName: (format) => `dsfr-tel.${format}.js`
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        }
      }
    }
  },
  test: {
    globals: true, // Permet d'utiliser `describe`, `test` sans import
    environment: "jsdom", // Simule un environnement DOM
    setupFiles: "./vitest.setup.ts", // Fichier d'initialisation
    exclude: [...configDefaults.exclude, "node_modules/**"], // Exclut les fichiers non pertinents
  },
});

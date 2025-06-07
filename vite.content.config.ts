import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-content",
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: "src/content/content_script.ts",
      output: {
        format: "iife",
        entryFileNames: "content_script.js",
      },
    },
  },
});
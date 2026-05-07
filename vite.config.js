import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/**
 * Vite configuration for the LED planner.
 * The alias keeps imports readable without introducing extra tooling complexity.
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/domain/spectral/all_series.json")) {
            return "spectral-series";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});

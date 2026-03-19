import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@zoneflow/core": path.resolve(__dirname, "../../packages/core/src"),
      "@zoneflow/renderer-dom": path.resolve(__dirname, "../../packages/renderer-dom/src"),
      "@zoneflow/react": path.resolve(__dirname, "../../packages/react/src"),
    }
  }
});
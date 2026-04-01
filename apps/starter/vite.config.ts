import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".jsx", ".json"],
    alias: {
      "@zoneflow/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@zoneflow/editor-dom": path.resolve(__dirname, "../../packages/editor-dom/src/index.ts"),
      "@zoneflow/renderer-dom": path.resolve(
        __dirname,
        "../../packages/renderer-dom/src/index.ts"
      ),
      "@zoneflow/react": path.resolve(__dirname, "../../packages/react/src/index.ts"),
    },
  },
});

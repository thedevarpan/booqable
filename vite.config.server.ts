import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    ssr: true,
    outDir: "dist/server",
    rollupOptions: {
      // Server ka entry point (yaha tumne banaya hoga server/start.ts)
      input: path.resolve(__dirname, "server/start.ts"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});

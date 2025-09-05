import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    ssr: "server/start.ts", // direct entry file
    outDir: "dist/server",
    rollupOptions: {
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

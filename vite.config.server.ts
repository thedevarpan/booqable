import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    ssr: "server/start.ts", // bas entry file ka relative path
    outDir: "dist/server",
    rollupOptions: {
      input: "server/start.ts", // yaha path.resolve ki zarurat nahi
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});

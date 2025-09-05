import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      try {
        const app = createServer();
        // Add Express app as middleware to Vite dev server
        server.middlewares.use(app);
      } catch (err) {
        // If server creation fails, log the error but allow Vite to continue
        // This prevents the Vite dev server from crashing due to server route issues
        // and allows frontend development to proceed while backend is debugged.
        // The backend should be fixed separately.
        // eslint-disable-next-line no-console
        console.error('Could not initialize Express middleware for dev server:', err);
      }
    },
  };
}

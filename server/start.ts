import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    build: {
        ssr: true,
        outDir: "dist/server",
        rollupOptions: {
            input: path.resolve(__dirname, "server/start.ts"),
        },
    },
});

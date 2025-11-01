// vite.config.ts or vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,              // allow access via Network URL
        port: 5173,
        hmr: true,               // keep HMR on
        watch: {
            usePolling: true,      // crucial for WSL2/Docker/shared folders
            interval: 100,         // tweak (100–300ms) if needed
        },
    },
});

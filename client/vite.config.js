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
    preview: {
        host: true,              // allow access via Network URL
        port: 5174,              // matches the port in package.json preview script
        // Allow all hosts for Railway deployment (dynamic domains)
        // In production preview mode, this is safe as the app is already built
        allowedHosts: true,
    },
});

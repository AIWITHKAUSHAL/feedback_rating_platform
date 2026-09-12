/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    host: true,
    // Lets `npm run dev` talk to the local API without CORS or a hard-coded
    // host: relative "/api/..." requests are forwarded to FastAPI.
    proxy: {
      "/api": { target: process.env.VITE_DEV_API_PROXY ?? "http://localhost:8000", changeOrigin: true },
      "/health": { target: process.env.VITE_DEV_API_PROXY ?? "http://localhost:8000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Production assets are uploaded to S3 and served through CloudFront.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: { provider: "v8", reporter: ["text"], include: ["src/**/*.{ts,tsx}"] },
  },
});

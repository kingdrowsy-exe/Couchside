import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { findAppRoot, readAppVersion } from "../scripts/app-version.mjs";

const appVersion = readAppVersion(findAppRoot(dirname(fileURLToPath(import.meta.url))));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.API_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});

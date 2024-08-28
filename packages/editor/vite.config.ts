import { relative } from "node:path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import vitePluginFaviconsInject from "vite-plugin-favicons-inject";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
    vitePluginFaviconsInject("./src/assets/favicon.svg", {
      appName: "OpenGB · Admin",
      theme_color: "#ff4f00",
    }),
  ],
  build: {
    // biome-ignore lint/style/noNonNullAssertion: it does not matter
    outDir: relative(__dirname, process.env.VITE_OUT_DIR! || "dist"),
  },
  server: {
    port: 6422,
    proxy: {
      "/__internal": {
        target: "http://127.0.0.1:6421",
        changeOrigin: true,
      },
    },
  },
});

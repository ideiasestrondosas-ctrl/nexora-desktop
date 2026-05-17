import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const analyze = process.env.ANALYZE === "true";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(analyze
      ? [visualizer({ open: true, filename: "dist/bundle-stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          tauri: ["@tauri-apps/api", "@tauri-apps/plugin-store", "@tauri-apps/plugin-log"],
          charts: ["recharts"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-progress", "@radix-ui/react-tooltip", "sonner"],
        },
      },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

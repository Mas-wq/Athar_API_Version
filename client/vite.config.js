import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/uploads": {
        target: "http://127.0.0.1:5102",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:5102",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5102",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

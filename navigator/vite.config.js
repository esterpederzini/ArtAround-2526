import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/mobile/",
  build: {
    outDir: "dist",
    emptyOutDir: true, // Questo pulisce la vecchia cartella dist ogni volta
  },
});

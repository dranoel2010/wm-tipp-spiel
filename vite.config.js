import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tailwind v4 laeuft als Vite-Plugin; CSS-Einstieg ueber `@import "tailwindcss";`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});

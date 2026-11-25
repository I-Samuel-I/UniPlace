import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O front chama /api e /media no próprio endereço; o Vite repassa ao Django.
// Assim o navegador não precisa de CORS durante o desenvolvimento.
const backend = {
  "/api": process.env.API_TARGET ?? "http://127.0.0.1:8000",
  "/media": process.env.API_TARGET ?? "http://127.0.0.1:8000",
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: backend },
  preview: { proxy: backend },
});

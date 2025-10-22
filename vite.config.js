import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // remove base OR set to "/" for Vercel root deployment
  // base: "/"
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "/moo-gpt/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // LangGraph / LangChain use AsyncLocalStorage from node:async_hooks.
      // The browser has no equivalent; this polyfill satisfies the import.
      "node:async_hooks": fileURLToPath(new URL("./src/polyfills/async_hooks.ts", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});

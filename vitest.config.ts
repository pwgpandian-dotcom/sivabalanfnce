import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Mirror the "@/..." path alias from tsconfig so unit tests can import app modules.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

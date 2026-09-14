import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The `@/*` -> `./src/*` alias tsconfig declares. Without it a test can only import a module
  // that itself imports nothing through the alias, which rules out testing anything above lib/.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // apps/web's tsconfig sets jsx: "preserve" for Next's own transform, so vitest's esbuild needs
  // telling. Without it every .tsx test fails with "React is not defined".
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    // .tsx so the DS primitives can be rendered. They are thin className string-builders with no
    // runtime behaviour, so react-dom/server is enough and no DOM environment is needed.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
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

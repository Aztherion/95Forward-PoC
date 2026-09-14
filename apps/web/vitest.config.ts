import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The `@/*` -> `./src/*` alias tsconfig declares. Without it a test can only import a module
  // that itself imports nothing through the alias, which rules out testing anything above lib/.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // See the stub for why.
      "server-only": fileURLToPath(new URL("./vitest.server-only-stub.ts", import.meta.url)),
    },
  },
  // apps/web's tsconfig sets jsx: "preserve" for Next's own transform, so vitest's esbuild needs
  // telling. Without it every .tsx test fails with "React is not defined".
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    // .tsx so the DS primitives can be rendered. They are thin className string-builders with no
    // runtime behaviour, so react-dom/server is enough and no DOM environment is needed.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Dummy values, as AGENTS.md sanctions for test and CI. Rendering any component whose import
    // graph reaches a server module pulls in the env schema, and a unit test should not have to
    // care that Topbar asks one boolean of the feedback config.
    env: {
      DATABASE_URL: "postgres://forward:forward@localhost:5432/forward",
      APP_DATABASE_URL: "postgres://app_user:app_user@localhost:5432/forward",
      AUTH0_DOMAIN: "test.us.auth0.com",
      AUTH0_CLIENT_ID: "test",
      AUTH0_CLIENT_SECRET: "test",
      AUTH0_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      APP_BASE_URL: "http://localhost:3000",
      AI_MODE: "mock",
      EMBEDDING_MODE: "mock",
      RESEARCH_MODE: "demo",
      FEEDBACK_MODE: "mock",
    },
  },
});

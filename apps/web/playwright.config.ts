import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const AUTH_FILE = "playwright/.auth/dana.json";

export default defineConfig({
  testDir: "./e2e",
  // Truncate + reseed the pristine demo dataset once before the whole suite. This is the permanent
  // fix for cross-run debris: specs that don't fully self-clean no longer accumulate state across
  // runs, because every run starts from the same seeded baseline.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The whole suite shares one `next dev` server, whose on-demand compilation is the bottleneck.
  // Capping workers keeps the server from being oversaturated (which timed out a random test per
  // run under the default ~50%-of-cores parallelism), without changing the dev-login auth seam.
  workers: 2,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /demo-journey\.spec\.ts/],
    },
    // The demo-journey spec retraces flows the per-feature specs own (it mutates the same seeded
    // Forever/Hallworth/Sandra-Kim rows those specs assert as baselines), so it runs as its own
    // project gated on `chromium` — a hard scheduling barrier that eliminates the parallel collision.
    {
      name: "demo-journey",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["chromium"],
      testMatch: /demo-journey\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm --filter @95forward/web exec next dev --port ${PORT}`,
    url: BASE_URL,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_TEST_MODE: "true",
      AUTH0_DOMAIN: "test.us.auth0.com",
      AUTH0_CLIENT_ID: "test",
      AUTH0_CLIENT_SECRET: "test",
      AUTH0_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      APP_BASE_URL: BASE_URL,
      DATABASE_URL: "postgres://forward:forward@localhost:5432/forward",
      APP_DATABASE_URL: "postgres://app_user:app_user@localhost:5432/forward",
      AI_MODE: "mock",
      EMBEDDING_MODE: "mock",
      RESEARCH_MODE: "demo",
      NODE_ENV: "development",
      // Make the mock model resolve slowly so the suite exercises the copilot-trigger
      // pending→resolved path (the latency-sensitive bug instant mocks never covered). Kept modest:
      // it applies per model call, and some flows (the copilot-lab double agent loop) make several.
      MOCK_LATENCY_MS: "400",
    },
  },
});

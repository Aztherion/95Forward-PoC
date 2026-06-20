import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const AUTH_FILE = "playwright/.auth/dana.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: `pnpm --filter @95forward/web exec next dev --port ${PORT}`,
    url: BASE_URL,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_DEV_LOGIN: "true",
      AUTH0_DOMAIN: "test.us.auth0.com",
      AUTH0_CLIENT_ID: "test",
      AUTH0_CLIENT_SECRET: "test",
      AUTH0_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      APP_BASE_URL: BASE_URL,
      DATABASE_URL: "postgres://forward:forward@localhost:5432/forward",
      NODE_ENV: "development",
    },
  },
});

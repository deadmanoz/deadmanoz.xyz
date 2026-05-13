import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${E2E_PORT}`,
        url: `http://localhost:${E2E_PORT}`,
        reuseExistingServer: !process.env.CI,
        env: { DISABLE_GIT_METADATA: "true" },
        timeout: 120_000,
      },
});

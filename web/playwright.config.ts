import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the smoke-test suite (distinct from the Vitest unit
 * suite, which runs under node). The tests spin up `next start` on a
 * non-default port so a dev server on :3000 doesn't get reused.
 *
 * Authenticated flows (sign-in → generate plan → tick day) are not yet
 * covered — they need a test-only auth bypass. See issue #12.
 */
const PORT = 3010;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

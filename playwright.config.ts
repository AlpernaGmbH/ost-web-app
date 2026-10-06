import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against a production build with dummy Supabase env: without a session cookie the
// proxy redirects before any network call, so no backend is needed for these checks.
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "dummy-key-for-smoke-tests",
  CRON_SECRET: "smoke-test-secret",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    ...devices["Pixel 7"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://127.0.0.1:3100/login",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env,
  },
});

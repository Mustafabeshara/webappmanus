import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Testing Configuration
 *
 * Run E2E tests: pnpm test:e2e
 * Run with UI: pnpm test:e2e:ui
 * Generate tests: pnpm test:e2e:codegen
 */
export default defineConfig({
  testDir: "./e2e",
  // Maximum time one test can run
  timeout: 30 * 1000,
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  // Reporter to use
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github" as const]] : []),
  ],
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5000",
    // Collect trace when retrying the failed test
    trace: "on-first-retry",
    // Capture screenshot on failure
    screenshot: "only-on-failure",
    // Record video on failure
    video: "on-first-retry",
  },

  // Configure projects for major browsers
  projects: [
    // Setup project to authenticate once for all tests
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use prepared auth state
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Mobile viewports
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

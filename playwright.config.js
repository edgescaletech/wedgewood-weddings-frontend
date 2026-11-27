import { defineConfig, devices } from "@playwright/test";
import { readEnvironment } from "./tests/environment.js";
const { frontend, backend, apiMode, live } = readEnvironment();
const baseURL = frontend.origin;
const noArtifacts = { trace: "off", screenshot: "off", video: "off" };
export default defineConfig({
  globalSetup: "./tests/preflight.js",
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    channel: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      grepInvert: /@(?:live|go)\b/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-go",
      grep: /@go\b/,
      use: { ...devices["Desktop Chrome"], ...noArtifacts },
    },
    {
      name: "chromium-live",
      grep: /@live/,
      // Real passwords, headers and cookies can appear in browser artifacts.
      use: { ...devices["Desktop Chrome"], ...noArtifacts },
      workers: 1,
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npm run dev -- --host localhost --port 4175 --strictPort",
    url: baseURL,
    env: { VITE_API_BASE_URL: apiMode === "direct" ? backend.origin : "" },
    reuseExistingServer: !process.env.CI && !live,
    timeout: 30_000,
  },
});

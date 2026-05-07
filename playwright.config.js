import { defineConfig, devices } from "@playwright/test";
import { env } from "node:process";

const baseURL = "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./test/browser",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...(env.CI ? {} : { channel: "chrome" }),
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});

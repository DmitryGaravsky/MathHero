import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [["list"]],
  outputDir: "test-results/pwa",
  use: {
    baseURL: "http://127.0.0.1:4174/MathHero/",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: ["chromium", "webkit"].map((browserName) => ({
    name: browserName,
    use: { browserName: browserName as "chromium" | "webkit" },
  })),
  webServer: {
    command: "node tests/pwa/server.mjs",
    url: "http://127.0.0.1:4174/MathHero/",
    reuseExistingServer: false,
  },
});

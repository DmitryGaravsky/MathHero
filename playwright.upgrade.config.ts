import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/upgrade",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
  outputDir: "test-results/upgrade",
  use: {
    baseURL: "http://127.0.0.1:4175/MathHero/",
    timezoneId: "Europe/Paris",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  projects: (["chromium", "webkit"] as const).map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
  webServer: {
    command: "node tests/pwa/server.mjs",
    env: {
      MATH_HERO_TEST_PORT: "4175",
      MATH_HERO_LEGACY_DIST: resolve(process.env.MATH_HERO_LEGACY_DIST ?? ".playwright/legacy-923d1f6/dist"),
    },
    url: "http://127.0.0.1:4175/MathHero/",
    reuseExistingServer: false,
  },
});

import { defineConfig } from "@playwright/test";

const sizes = [
  {
    name: "phone-portrait",
    viewport: { width: 390, height: 844 },
    isMobile: true,
  },
  {
    name: "phone-landscape",
    viewport: { width: 844, height: 390 },
    isMobile: true,
  },
  {
    name: "tablet-portrait",
    viewport: { width: 820, height: 1180 },
    isMobile: true,
  },
  {
    name: "tablet-landscape",
    viewport: { width: 1180, height: 820 },
    isMobile: true,
  },
];
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  outputDir: "test-results/browser",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/MathHero/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: (["chromium", "webkit"] as const).flatMap((browserName) =>
    sizes.map((size) => ({
      name: `${browserName}-${size.name}`,
      use: {
        browserName,
        viewport: size.viewport,
        isMobile: size.isMobile,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    })),
  ),
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/MathHero/",
    reuseExistingServer: !process.env.CI,
  },
});

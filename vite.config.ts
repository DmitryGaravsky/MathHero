import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import release from "./package.json" with { type: "json" };

export default defineConfig({
  base: "/MathHero/",
  plugins: [
    react(),
    {
      name: "math-hero-release-metadata",
      transformIndexHtml: () => [{ tag: "meta", attrs: { name: "application-version", content: release.version } }],
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    clearMocks: true,
  },
});

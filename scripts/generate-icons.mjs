import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Preserve the existing vector fox identity; keep the face inside the mask safe zone.
const favicon = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
const drawing = favicon.replace(/<svg[^>]*>/, "").replace("</svg>", "");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#6558d4"/><g transform="translate(8 8)">${drawing}</g></svg>`;
const directory = new URL("../public/icons/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["maskable-512", 512], ["apple-touch-icon", 180]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, directory)) });
    await page.close();
  }
} finally {
  await browser.close();
}

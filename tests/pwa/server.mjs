import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// A local release fixture: serve real dist, with switchable revision and asset outage.
// It is never copied to dist or used by production hosting.
let release = "A";
let failAsset = false;
let failIcon = false;
const root = new URL("../../dist/", import.meta.url);
const legacyRoot = process.env.MATH_HERO_LEGACY_DIST;
const port = Number(process.env.MATH_HERO_TEST_PORT ?? 4174);
const types = { html: "text/html", js: "text/javascript", css: "text/css", png: "image/png", svg: "image/svg+xml", webmanifest: "application/manifest+json" };
createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/__test/release" && request.method === "POST") {
    release = url.searchParams.get("version") ?? "A";
    failAsset = url.searchParams.get("fail") === "true";
    failIcon = url.searchParams.get("fail") === "icon";
    response.end("OK");
    return;
  }
  if (!url.pathname.startsWith("/MathHero/")) {
    response.writeHead(404).end();
    return;
  }
  const file = url.pathname.slice("/MathHero/".length) || "index.html";
  if (file.includes("..") || (failAsset && file.endsWith(".css")) || (failIcon && file === "icons/icon-512.png")) {
    response.writeHead(503).end();
    return;
  }
  try {
    if (release === "legacy" && !legacyRoot) throw new Error("Legacy build directory required");
    const source = release === "legacy" ? join(legacyRoot, file) : new URL(file, root);
    let data = await readFile(source);
    if (release !== "legacy" && release !== "candidate") {
      if (file === "index.html") data = Buffer.from(data.toString().replace('<html lang="es">', `<html lang="es" data-release="${release}">`));
      if (file === "sw.js") data = Buffer.from(data.toString().replaceAll(/math-hero:\/MathHero\/:([a-f0-9]{20})/g, `math-hero:/MathHero/:$1-${release}`));
    }
    response.setHeader("Content-Type", types[file.split(".").at(-1)] ?? "application/octet-stream");
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "127.0.0.1");

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../dist/", import.meta.url);
const entries = await readdir(root, { recursive: true, withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) continue;
  assert(entry.isFile(), "Only regular built files may be published");
  const name = relative(fileURLToPath(root), join(entry.parentPath, entry.name)).replaceAll("\\", "/");
  assert(/^(index\.html|sw\.js|favicon\.svg|manifest\.webmanifest|icons\/(icon-192|icon-512|maskable-512|apple-touch-icon)\.png|assets\/[\w-]+\.(js|css))$/.test(name), `Unexpected publication: ${name}`);
}
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
for (const field of ["id", "start_url", "scope"]) assert.equal(manifest[field], "/MathHero/");
assert.equal(manifest.display, "standalone");
for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["maskable-512", 512], ["apple-touch-icon", 180]]) {
  const data = await readFile(new URL(`icons/${name}.png`, root));
  assert.equal(data.subarray(1, 4).toString(), "PNG");
  assert.equal(data.readUInt32BE(16), size);
  assert.equal(data.readUInt32BE(20), size);
}
const html = await readFile(new URL("index.html", root), "utf8");
assert(html.includes('/MathHero/manifest.webmanifest'));
assert(html.includes('/MathHero/icons/apple-touch-icon.png'));
assert(!html.includes('/src/'));
const worker = await readFile(new URL("sw.js", root), "utf8");
assert(!worker.includes("__PRECACHE__"));
console.log("Distribution verified: app assets only, correct base/scope and PNG sizes.");

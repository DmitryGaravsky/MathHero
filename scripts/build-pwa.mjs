import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";

const base = "/MathHero/";
const root = new URL("../dist/", import.meta.url);
const files = (await readdir(root, { recursive: true }))
  .filter((file) => /\.(html|js|css|svg|png|webmanifest)$/.test(file) && file !== "sw.js")
  .map((file) => file.replaceAll("\\", "/"))
  .sort();
const template = await readFile(new URL("service-worker.js", import.meta.url), "utf8");
const hash = createHash("sha256").update(template);
for (const file of files) hash.update(file).update(await readFile(new URL(file, root)));
const revision = hash.digest("hex").slice(0, 20);
const worker = template
  .replaceAll("__CACHE_NAME__", JSON.stringify(`math-hero:${base}:${revision}`))
  .replaceAll("__CACHE_PREFIX__", JSON.stringify(`math-hero:${base}:`))
  .replaceAll("__PRECACHE__", JSON.stringify(files.map((file) => base + file)));
await writeFile(new URL("sw.js", root), worker);
console.log(`PWA ${revision}: ${files.length} app assets precached at ${base}`);

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const cache = join(root, ".playwright");
mkdirSync(cache, { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run the upgrade suite with npm run test:upgrade.");

const run = (command, args, cwd, env = process.env) =>
  execFileSync(command, args, { cwd, env, stdio: "inherit" });

function buildPublishedRelease(commit, workerRevision) {
  const source = mkdtempSync(join(cache, `legacy-${commit.slice(0, 7)}-`));
  const archive = join(source, "source.tar");
  run("git", ["archive", `--output=${archive}`, commit], root);
  run("tar", ["-xf", archive, "-C", source], root);
  const lockfile = "package-lock.json";
  if (!readFileSync(join(source, lockfile)).equals(readFileSync(join(root, lockfile)))) {
    run(process.execPath, [npm, "ci"], source);
  }
  run(process.execPath, [npm, "run", "build"], source);
  const dist = join(source, "dist");
  if (!readFileSync(join(dist, "sw.js"), "utf8").includes(`math-hero:/MathHero/:${workerRevision}`)) {
    throw new Error(`The built service worker does not match the published revision ${workerRevision}.`);
  }
  console.log(`Upgrade fixture ${commit} / worker ${workerRevision}: ${dist}`);
  return dist;
}

const mvp = buildPublishedRelease("923d1f634047322e688eafb38679ad3dba66e1d7", "7a73513eb82bcfc66d1d");
const release11 = buildPublishedRelease("9309abde58cff9c001e7944f29d2b727965ee093", "01ee92a8204ef083b478");
run(process.execPath, [
  join(root, "node_modules", "@playwright", "test", "cli.js"),
  "test", "--config", "playwright.upgrade.config.ts", ...process.argv.slice(2),
], root, { ...process.env, MATH_HERO_LEGACY_DIST: mvp, MATH_HERO_11_DIST: release11 });

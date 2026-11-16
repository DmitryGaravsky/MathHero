# Stage 5 — offline PWA and release preparation

Status — historical MVP stage record. See the
[current release instructions](../development/RELEASE.md).

Implemented locally on 15 November 2026 (Europe/Paris), on top of accepted
`a2d97f2`. Ready for coordinator review; no commit, push, remote Pages setting
change or deployment was performed by this stage. `AGENTS.md` and `DELIVERY.md`
were not edited by this worker; the latter already had coordinator changes.

## Delivered behavior

The manifest uses the exact `/MathHero/` id, start URL and scope, standalone
display, Spanish default language and the existing theme. It does not lock
orientation. The HTML links the manifest, SVG favicon and 180×180 Apple icon and
contains Apple standalone metadata. The existing responsive layout already uses
`viewport-fit=cover` and safe-area insets. No engine or persistence schema changed.

The 192×192, 512×512, maskable 512×512 and Apple 180×180 PNGs are rendered from
the existing vector fox, without a new dependency or external image service.
The opaque maskable background covers the full image; the fox stays inside the
central safe circle. `npm run icons:generate` reproduces these assets using the
already pinned Playwright Chromium.

`npm run build` now runs types, Vite, worker generation and distribution checking.
The worker's cache revision is a SHA-256 digest of the worker template plus all
emitted application asset names and bytes. Its nine precached assets include the
HTML, bundled JS/CSS, manifest, favicon and four PNGs. `sw.js` is the tenth
published file. No runtime CDN, remote font, backend or extra library is used.
The allowlist rejects unexpected files, including docs, source, JSON backups,
attachments and source maps, and verifies PNG dimensions and manifest paths.

Install succeeds only if every asset downloads. A failed install removes its
incomplete version and retains any complete active version. The worker serves
its version's cached shell for root/index navigations and cached exact URLs for
its own assets. Hash routing remains unchanged. Other origins, other application
paths, unknown paths and non-GET requests are not intercepted or runtime-cached.
Activation removes only caches prefixed `math-hero:/MathHero/:`; it never clears
IndexedDB or another GitHub Pages application's cache.

## Update and persistence contract

There is no `skipWaiting`, reload command, update button that can interrupt an
answer, or session-timer interaction. A new worker waits until every client of
the old worker is closed/navigated away. First activation claims the initial
page only after precaching succeeds. A new version's normal activation also
claims clients; old controlled clients have already left by then.

Settings reports preparing, ready, unavailable, or waiting-update state in both
RU and ES, with Safari installation instructions. The status uses a polite live
region without introducing a second generic status role beside backup results.
Guidance tells users to pause and close all tabs/windows, including the Home
Screen window, then reopen. Reloading one tab while another remains open keeps
the old complete release. The reopened session is paused and retains its saved
draft. Existing session ownership protects against stale tabs.

Registration occurs only in production, uses the base path and `updateViaCache:
"none"`, and checks for updates on launch. Reconnection updates the active
registration or registers again if a failed initial installation left no active
worker. Registration/download failures do not break local learning. Browser
cache eviction still requires an online revisit; offline readiness is not a
promise of permanent storage.

## CI and publication contract

`.github/workflows/deploy.yml` uses Ubuntu 24.04 and Node 24.22.1. Pushes to main,
pull requests to main and manual dispatch run `npm ci`, lint, typecheck, unit
tests, Linux browser/dependency installation, build, the full browser matrix and
PWA tests. Only successful main runs upload `./dist`; PRs cannot publish.

The deployment job has `needs: verify`, environment `github-pages`, and the
environment URL from the deployment action. Default permissions are read-only
contents; only deploy receives `pages: write` and `id-token: write`. Checkout
does not persist credentials. Per-ref concurrency prevents overlapping releases
and does not cancel a release in progress. No runtime settings or generated
source attachment enters the artifact.

Official release tags and their commit refs were queried directly from GitHub's
API, then the exact tagged `action.yml` files were read on 15 November 2026.
The public README examples lagged these releases, so the workflow pins the
verified tagged commits rather than copying the old examples:

| Action | Release / pinned commit | Official source |
| --- | --- | --- |
| checkout | v7.0.1 / `3d3c42e5aac5ba805825da76410c181273ba90b1` | [tagged action](https://github.com/actions/checkout/blob/v7.0.1/action.yml) |
| setup-node | v7.1.0 / `949feb2413d6458794dcd2491c4babbbce0c15c1` | [tagged action](https://github.com/actions/setup-node/blob/v7.1.0/action.yml) |
| upload-pages-artifact | v5.0.0 / `fc324d3547104276b827a68afc52ff2a11cc49c9` | [tagged action](https://github.com/actions/upload-pages-artifact/blob/v5.0.0/action.yml) |
| deploy-pages | v5.0.1 / `368f82528645a54fb793d4d04e342629a3f51346` | [tagged action](https://github.com/actions/deploy-pages/blob/v5.0.1/action.yml) |

Checkout, setup-node and deploy-pages declare Node 24 runtimes. The Pages upload
action is composite and pins upload-artifact v7.0.0. The hosted Ubuntu runner
provides the supported environment; actual Linux CI execution is still a release
gate, not something established by local Windows tests.

No dependencies changed; the committed lockfile is unchanged. Official npm
metadata was checked for the existing toolchain:

| Package | Verified compatibility |
| --- | --- |
| [Vite 8.3.8](https://registry.npmjs.org/vite/8.3.8) | Node `^20.19.0 \|\| >=22.12.0` includes Node 24 |
| [plugin-react 6.3.0](https://registry.npmjs.org/@vitejs/plugin-react/6.3.0) | Same Node range; Vite peer `^8.0.0` |
| [Vitest 5.1.0](https://registry.npmjs.org/vitest/5.1.0) | Node `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`; Vite 8 supported |
| [Playwright 1.65.1](https://registry.npmjs.org/@playwright/test/1.65.1) | Node `>=20` |
| [typescript-eslint 8.72.2](https://registry.npmjs.org/typescript-eslint/8.72.2) | TypeScript `>=4.8.4 <6.1.0` includes 6.0.3; ESLint 10 supported |

Additional references: [Playwright CI](https://playwright.dev/docs/ci-intro)
for `install --with-deps`, [Vite Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
for repository base and dist publishing, and [service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
for waiting workers and activation. The custom worker keeps this lifecycle
without adding a PWA dependency.

## Documentation and resolved details

`docs/specification.txt` is a full English translation of all 18 original
sections. Its original example names, proposed schemas, numerical thresholds,
directory diagrams, historical Actions versions and original 0/16 checklist
remain specification content, not a rewritten implementation report. Nine
schema/diagram/workflow blocks were compared byte-for-byte after newline
normalization with `HEAD:docs/specification.txt`; all matched. The localization
example labels its formerly Russian column as English translations and keeps
the Spanish UI examples. No external user attachment was modified.

README now covers setup/checks, learning, storage and backup, installation,
offline behavior, updates, CI, limitations and the distinction between target
publication and actual delivery evidence. `docs/DEVICE-ACCEPTANCE.md` provides
the real iPhone/iPad Safari/Home Screen checklist and measurement conditions.
All rows are explicitly unexecuted. Repository documentation and comments were
scanned for Cyrillic: none remained outside localized UI values and test
assertions/selectors that intentionally match that UI.

The update decision is deliberately conservative: all application clients must
close before activation, rather than coordinating a forced in-place takeover.
The original optional-PWA wording remains translated faithfully; the already
resolved final-MVP requirement is implemented. Existing v1/v2/v3 migration,
transactional backup and adaptive-engine contracts remain unchanged.

## Executed verification

Environment: Windows, Node 24.22.1, npm 11.19.1, Playwright 1.65.1. Bundled browser
metadata reports Chromium 159.0.8154.6 (revision 1255) and WebKit 27.2 (2388).
No physical Apple device was used. Browser execution used approved standard tool
escalation; the sandbox initially could not locate the installed Chromium binary.
No automatic approval rejection occurred. No owned preview was running at npm ci.

| Command / check | Actual result |
| --- | --- |
| `node scripts/generate-icons.mjs` | Passed outside sandbox; four PNGs produced |
| `npm ci` | Passed; 231 packages installed, 232 audited, zero reported vulnerabilities |
| `npm run build` | Passed, including typecheck, deterministic worker generation and dist audit |
| `npm run lint` | Passed |
| `npm test` | 54/54 passed in five files; existing migrations/backup/engine simulations retained |
| `npm run test:pwa` | 10/10 passed, Chromium and WebKit; zero skips/retries, 27.8 seconds |
| `npm run test:e2e` | 114 passed, six intentional redundant full-diagnosis skips, zero retries, 3.4 minutes |
| `git diff --check` | Passed |
| Documentation/comment audit | English prose/comments; RU/ES product values preserved |
| Translation structure audit | 18 sections; nine original schema/diagram/workflow blocks unchanged |

Final build: HTML 0.94 kB, CSS 16.81 kB, JS 406.43 kB (gzip 126.18 kB).
The full matrix covers Chromium and WebKit at 390×844, 844×390, 820×1180 and
1180×820. Full 144-answer diagnosis passes in both phone-portrait engines;
the other six profiles skip only that redundant full run, retaining part flows.
Worker revision: `7a73513eb82bcfc66d1d`. The production fixture uses this actual
build, with release markers/cache suffixes and a local asset-failure switch to
simulate deployments. It does not mock the service worker API and is never
copied into dist. Separate contexts isolate browser storage; the suite is serial
because release state belongs to its local fixture server.

PWA tests prove manifest/scope, offline reload and learning, saved draft/new-window
resume, RU/ES readiness, no off-origin page requests, complete asset caching,
waiting with two tabs, no navigation/time-origin change during an active answer,
unchanged paused response time, activation after clients leave, offline launch
of the new release, removal of only old own caches and preservation of another
app's sentinel cache. Failed CSS update downloads keep the old release; a failed
initial icon download reports unavailable, leaves no partial cache, and succeeds
after reconnection. Existing full browser tests independently exercise simulated
hidden-page events, ownership, backup restore and keyboard paths.

Intermediate issues were fixed before the final run: replacing all worker
template markers (the lint-global comment also contained them), Windows path
normalization in the distribution checker, an ambiguous language-switcher test
locator, and re-registering after an initial installation failure. An intermediate
PWA run had six passes and two locator failures; those are not final pass evidence.

Visually inspected WebKit phone RU offline settings, Chromium phone ES waiting
update settings and the maskable PNG. Text wraps cleanly inside the card and the
icon has ample safe-zone padding. Full-page screenshots show fixed navigation
at the original viewport boundary; scrolling exposes lower settings normally.
Final screenshots are in ignored `test-results/pwa/`; full matrix screenshots
are in `test-results/` and its HTML report.

## Startup measurement: desktop evidence only

The test measures navigation start to the visible home practice link using
`performance.now()`, including Playwright's observation overhead. Five fresh
browser contexts per engine use empty IndexedDB and an empty HTTP/worker cache
for cold samples, then reload offline after successful precaching. HTTP loopback
on Windows, no CPU/network throttling, default desktop viewport, no device
emulation in this timing test. The final run overlapped the two-worker browser
regression and unit checks; it is not an isolated benchmark or an iPhone claim.
The test reports `process.platform` so later Linux CI samples are labelled correctly.

| Engine / condition | Samples in ms | Median | Maximum |
| --- | --- | --- | --- |
| Chromium cold online | 210, 186, 185, 195, 188 | 188 | 210 |
| Chromium warm offline | 83, 73, 72, 74, 64 | 73 | 83 |
| WebKit cold online | 328, 302, 296, 333, 337 | 328 | 337 |
| WebKit warm offline | 195, 208, 309, 202, 225 | 208 | 309 |

All local samples were below three seconds under those conditions. They do not
establish the specification's actual-device/normal-network target. The device
checklist asks for separate cold online, warm online and offline launch samples,
device/OS/network/data-size/load details, medians and maxima.

## Changed files

- `.github/workflows/deploy.yml`.
- `public/manifest.webmanifest`, four `public/icons/*.png`, and `index.html`.
- `scripts/{build-pwa,check-dist,generate-icons}.mjs`, `scripts/service-worker.js`.
- `src/pwa/register.ts`, `OfflineSettings.tsx`, Settings integration, main
  registration, localized RU/ES strings and settings-card CSS.
- `package.json` scripts, `tsconfig.json`, `playwright.pwa.config.ts`,
  `tests/pwa/{offline.spec.ts,server.mjs}`. No dependency/lockfile changes.
- README, full English specification, device checklist and this handoff.

## Outstanding release and physical-device gates

1. Coordinator reviews the local diff and records acceptance/chat evidence in
   DELIVERY.md, then commits and pushes using the authorized project identity.
2. During final verification the coordinator reported that `POST /pages` had
   configured `build_type=workflow`, `public=true`, `https_enforced=true`, with URL
   `https://dmitrygaravsky.github.io/MathHero/`. Pages was absent at stage entry;
   configuration is now reported complete. This worker did not perform that
   action. Configuration is not publication or deployment acceptance.
3. Wait for the real Linux verification/upload/deployment jobs. Record workflow
   run URL, commit and successful environment deployment; fix any failures here.
4. Verify the deployed HTTPS `/MathHero/` URL, manifest/icons, first installation,
   offline reload and safe update behavior against actual Pages headers/content.
   The local HTTP loopback tests are not a deployed-site check.
5. User completes the physical iPhone/iPad checklist. Real Safari keyboards,
   installation, storage partitioning, background/process termination, safe areas,
   backup Files integration and real startup time remain unverified.

Inherited limitations remain: 20 MB backup-picker limit, synchronous large-history
validation/migration, local-only storage with possible eviction, and possible loss
of the newest uncommitted asynchronous checkpoint on abrupt process termination.
Service worker updates do not change the established atomic answer/restore model.

## Coordinator release acceptance

After reviewing this handoff, the coordinator committed and pushed release
`923d1f634047322e688eafb38679ad3dba66e1d7`. The actual Ubuntu 24.04 workflow
[43726324618](https://github.com/DmitryGaravsky/MathHero/actions/runs/43726324618)
passed verification (54 unit/repository, 114 browser, 10 PWA, six intentional
diagnosis skips) and deployment. Verification took 4m3s; deployment took 11s.
The site is live at https://dmitrygaravsky.github.io/MathHero/ with the same
worker revision `7a73513eb82bcfc66d1d` verified locally and in CI.

Independent Chromium and WebKit checks on that actual HTTPS origin passed:
HTTP 200, manifest/scope and all nine cached assets, offline new-window draft
resume, a correct answer and single reward retained after offline reload,
localized RU/ES offline readiness, and no page errors. The live phone layout
was visually inspected. These checks used fresh isolated browser contexts.
New-version lifecycle and failure injection remain production-build local
fixture tests; no second artificial public release was created solely for testing.

Initial real-origin startup observations were 3293 ms (Chromium) and 696 ms
(WebKit). Five follow-up fresh-context samples were 211/203/204/203/502 ms and
711/316/310/312/310 ms respectively. Conditions: Windows desktop, 390×844 mobile
viewport, actual HTTPS, empty browser-context storage/cache, no throttling.
The first >3-second observation is retained. Its cause was not established;
later samples do not prove the real-device startup target. Physical iPhone/iPad
acceptance and measurements remain the only unchecked MVP gate.

Final status and the device handoff are maintained in `docs/DELIVERY.md` and
`docs/DEVICE-ACCEPTANCE.md`. The final documentation-only commit leaves the
verified application artifact unchanged.

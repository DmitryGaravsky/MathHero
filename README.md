# Math Hero

A multiplication fluency trainer for iPhone and iPad, covering factors 1–12.
React, TypeScript and Vite; Russian and Spanish UI; local IndexedDB; no backend,
accounts, child identifiers, telemetry or cloud synchronization. MIT licensed.

[Open Math Hero](https://dmitrygaravsky.github.io/MathHero/) ·
[Verified release](https://github.com/DmitryGaravsky/MathHero/actions/runs/43726324618)

The application implements all 144 directed facts and 78 canonical pairs, a resumable
6 × 24 diagnostic, adaptive and targeted practice, spaced review, mastery across
multiple days, progress and achievements, an interactive map, parent analytics,
validated JSON backup/restore, and an installable offline PWA. Diagnosis establishes baseline difficulty;
it never grants mastery, stars or achievements. The coordinator tracks acceptance
in [DELIVERY.md](docs/DELIVERY.md).

## Local development

Requires Node.js 24 (at least 24.15) and npm. Preparation verified Node 24.22.1 and
npm 11.19.1. The project `.npmrc` selects the public registry without changing
global settings for other repositories.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/MathHero/`. Hash navigation needs no server rewrites.
Do not run `npm ci` while a preview process is using the installed dependencies.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run browsers:install
npm run test:e2e
npm run test:pwa
```

Playwright starts the built preview on port 4173. Build first. The PWA suite uses
a separate local release fixture on port 4174, serving the same production build
at `/MathHero/`. It exercises offline reload/new windows, multiple tabs, safe
updates, failed asset downloads, recovery, and reports desktop startup samples.
The browser matrix
covers Chromium and WebKit at four phone/tablet viewport sizes, in both locales.
It tests input, diagnostics, adaptive sessions, persistence, map navigation,
JSON downloads and imports, and responsive layout. This is browser emulation,
not physical iPhone/iPad acceptance. Reports and screenshots are in the ignored
`playwright-report/` and `test-results/` directories.

On Linux CI, install the browsers and their OS dependencies with
`npx playwright install --with-deps chromium webkit`. Development mode does not
register a worker: use `npm run build` and `npm run preview` to test installation
and offline behavior. Keep development and preview on their separate ports.

## Learning

Begin with the optional baseline diagnosis: 144 shuffled directions in six parts
of 24. Pause and resume at any point. Daily adaptive practice uses 24 exercises
with warm-up, practice and challenge phases; the time goal is an invitation, and
sessions can end early. Difficult exercises receive extra practice with other
facts between repetitions. The table map also starts targeted pair practice.

Correctness and speed are separate. Only correct responses contribute to speed
statistics. Mastery needs fast, accurate evidence on multiple days and both
directions of a nonsquare pair; one good session is insufficient. Diagnosis
does not grant mastery or rewards. Results include child-facing achievements and
expandable parent analytics. Spanish is the default; RU/ES, animations and the
daily goal are available in Settings. This version is silent.

The custom keypad is primary. The keyboard button enables the device keyboard;
a physical keyboard also works. Pausing, leaving practice or hiding the page
stops active response timing. Returning requires explicit resume. Saved drafts
and feedback survive reloads. Avoid practicing the same session in two tabs:
the most recent explicit resume owns it, and a stale tab must reload its data.

## Data and backups

Dexie schema v3 stores sessions, attempts, pair progress, preferences, the ordered
attempt journal, reward events, and a reward counter/day index. Answers and their
rewards commit atomically. Stars are computed from unique reward events. Current
mastery and previously earned achievements are distinct.

Settings exports a versioned JSON file with every table, including incomplete
sessions and drafts. Import validates the entire file and reconstructs derived
progress, statistics and rewards before offering replacement. Confirmation
replaces the whole local history in one transaction; cancellation and failed
transactions preserve the previous database. Restore clears session ownership
so an old tab cannot overwrite the restored session. Import is replacement,
not merging; keep a current backup before replacing data.

Keep copies outside browser storage. Clearing Safari data can remove everything
stored here. Backups contain learning history but no child identity or account.
A consistency check is not a digital signature: a deliberately rewritten,
self-consistent history cannot be authenticated without an external authority.

## Installation, offline operation and updates

The published application is available at
[dmitrygaravsky.github.io/MathHero](https://dmitrygaravsky.github.io/MathHero/).
See [delivery status](docs/DELIVERY.md) for actual publication evidence.
Open it online once and wait until Settings says it is ready for offline practice.
The complete app shell and bundled code, styles and icons are cached; practice,
results, language switching and JSON backups need no CDN, account or network.

In Safari, use **Share → Add to Home Screen**. Launch the icon to use standalone
mode. Other supporting browsers offer their own install command. The manifest
allows both orientations; the layout uses safe-area insets. The 192/512 icons,
maskable icon and 180-pixel Apple icon preserve the existing fox design. To
regenerate them after changing the vector artwork, run `npm run icons:generate`
with Chromium installed, then rebuild.

Opening the application online checks for a new version. A full release must
download successfully before it can activate. Settings reports a waiting update.
Pause practice, close **all** Math Hero tabs/windows, including the Home Screen
window, and reopen. An update never forces a reload or interrupts an answer.
Reloading one tab while another remains open intentionally keeps the old release.
Saved sessions resume paused after the new version starts. A failed download
keeps the previous complete release; reconnection retries installation/update.
The worker handles only `/MathHero/` and deletes only this application's old
cache versions. It does not clear IndexedDB or other GitHub Pages apps' caches.

Offline use requires a successful initial installation in that browser/storage
container. Clearing browser data, private browsing restrictions, storage eviction
or device loss can remove data or offline files. Keep backups outside the browser.
Safari and a Home Screen app may have separate storage; verify on your device and
use export/import to transfer history when needed. Local HTTP loopback is suitable
for tests; installation on the published site uses HTTPS.

## Project structure

- `src/app`: shell, hash navigation, live preferences and localization.
- `src/components`: shared controls, keypad and four SVG fox expressions.
- `src/features`: home, training, results, interactive map and settings.
- `src/engine/core`: exercise, clock and random-source contracts.
- `src/engine/multiplication`: directed facts, canonical pairs and evaluation.
- `src/engine/sessions`: diagnosis, active timing and baseline statistics.
- `src/engine/learning`: scheduler, intervals, mastery, analytics and reward replay.
- `src/database`: Dexie v3, atomic repositories, incremental rewards, backup validation.
- `src/locales`: all RU/ES interface text.
- `src/pwa`, `scripts`: worker registration, deterministic cache generation,
  icon generation and a distribution allowlist check.
- `tests`: engine/component/repository and browser acceptance tests.
- `docs/stages`: implementation evidence and handoffs.

The engine has no React or DOM dependency. See the
[diagnostic contract](docs/stages/02-engine-diagnostics.md),
[learning contract](docs/stages/03-adaptive-learning.md), and
[progress and backup contract](docs/stages/04-progress-backup.md).

## Dependencies and deployment

Direct dependency versions and the lockfile are pinned. TypeScript 6.0.3 fits
the typescript-eslint peer range (`<6.1.0`). The scoped
`@typescript-eslint/typescript-estree → minimatch 11.0.1` override addresses
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) in lint tools;
review the override when updating typescript-eslint.

The release workflow uses Node 24.22.1 on Ubuntu 24.04 and installs from the
committed lockfile. Lint, types, unit/repository tests, both browser engines and
PWA acceptance must pass before upload. Actions are pinned to verified release
commit SHAs. Pull requests run the checks; only `main` can deploy. The deployment
job depends on verification, targets `github-pages`, and alone receives Pages
and OIDC write permissions. Set the repository's Pages source to GitHub Actions.

Only built `dist/` assets are uploaded, with the case-sensitive base and scope
**`/MathHero/`**. The build verifies an explicit file allowlist; source documents,
tests, backup files, attachments and source maps are not published. The original
specification's lowercase repository name and old Actions snippet remain intact
as historical examples in its full English translation; the real configuration
uses the subsequent repository decision and current verified releases.

## Remaining acceptance and limits

Automated Chromium/WebKit runs do not establish behavior on physical Apple
devices. The user will complete [DEVICE-ACCEPTANCE.md](docs/DEVICE-ACCEPTANCE.md),
including actual keyboards, Safari/Home Screen storage, process restarts, safe
areas and the three-second startup criterion under recorded conditions. Desktop
loopback timings are synthetic evidence only. Linux CI, Pages deployment and
live-origin Chromium/WebKit offline checks passed for release `923d1f6`;
see [delivery evidence](docs/DELIVERY.md). The initial live Chromium launch took
3.29 seconds; later fresh-context samples were below one second. Physical-device
startup under a recorded normal connection remains an acceptance item.

Large histories are read into memory; backup validation and migration are
synchronous. The file picker limits imports to 20 MB. An abrupt termination
before an asynchronous draft/preference checkpoint commits may lose that latest
change; saved answer transactions and confirmed replacements remain atomic.
There are no accounts, cloud sync, voice input, division exercises or competitions.

Tool references: [Vite](https://vite.dev/guide/),
[Vitest](https://vitest.dev/guide/),
[Playwright browsers](https://playwright.dev/docs/browsers).

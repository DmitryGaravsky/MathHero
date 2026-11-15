# Math Hero

A multiplication fluency trainer for iPhone and iPad, covering factors 1–12.
React, TypeScript and Vite; Russian and Spanish UI; local IndexedDB; no backend,
accounts, child identifiers, telemetry or cloud synchronization. MIT licensed.

Stages 1–4 implement all 144 directed facts and 78 canonical pairs, a resumable
6 × 24 diagnostic, adaptive and targeted practice, spaced review, mastery across
multiple days, progress and achievements, an interactive map, parent analytics,
and validated JSON backup/restore. Diagnosis establishes baseline difficulty;
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
```

Playwright starts the built preview on port 4173. Build first. The browser matrix
covers Chromium and WebKit at four phone/tablet viewport sizes, in both locales.
It tests input, diagnostics, adaptive sessions, persistence, map navigation,
JSON downloads and imports, and responsive layout. This is browser emulation,
not physical iPhone/iPad acceptance. Reports and screenshots are in the ignored
`playwright-report/` and `test-results/` directories.

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

Only built `dist/` assets will be deployed, with the case-sensitive base
**`/MathHero/`**. Source documents are not copied into the build. PWA caching,
GitHub Actions compatibility checks and GitHub Pages publishing belong to stage 5;
stage 4 does not implement or claim offline availability or deployment.

Tool references: [Vite](https://vite.dev/guide/),
[Vitest](https://vitest.dev/guide/),
[Playwright browsers](https://playwright.dev/docs/browsers).

# Column arithmetic stage 5 handoff

MathHero 1.2.0 release candidate on `codex/column-05-release`, based on the
accepted stage 4 merge `a252ef9`. Local candidate evidence recorded on
17 November 2026 (Europe/Paris).

## Changed files

| Paths | Change |
| --- | --- |
| `package.json`, `package-lock.json` | Set 1.2.0 in the package and both lockfile version fields. Dependency versions, integrity values and overrides match the accepted integration baseline. |
| `index.html`, `public/manifest.webmanifest`, `vite.config.ts` | Describe both modules in default Spanish and stamp the HTML application version from package metadata. The manifest ID, scope and start URL use `/MathHero/`. |
| `tests/upgrade/published11Worker.spec.ts` | Adds a real published 1.1 worker update with offline startup and a second offline window. The existing native MVP and 1.1 database and backup cases run alongside it. |
| `README.md`, `docs/README.md`, `docs/product/{FEATURES,OVERVIEW,POSITIONING,ROADMAP}.md` | Describe current product scope and link both the pending 1.2 and completed 1.1 evidence. |
| `docs/user/{CHILD_GUIDE,DATA_AND_BACKUP,PARENT_GUIDE,SETTINGS}.md` | Document both practice flows, operation-level evidence, backup scope, upgrade and shared preferences. |
| `docs/pedagogy/{ADAPTIVE_TRAINING,COLUMN_ARITHMETIC,DIAGNOSTICS,MASTERY_POLICY}.md` | Scope multiplication policies to that module and distinguish column pilot parameters from educational norms. |
| `docs/architecture/{COLUMN-ARITHMETIC,DATA_MODEL,ENGINE,OVERVIEW,STORAGE}.md`, `docs/architecture/DECISIONS/README.md` | Describe the separate engines, worker-to-database upgrade and the implemented schema and replay contracts. |
| `docs/development/{CODE_STYLE,CONTRIBUTING,RELEASE,SETUP,TESTING}.md` | Update current references and explain the candidate and published-baseline verification procedure. |
| `docs/DEVICE-ACCEPTANCE-1.2.md` | Adds a pending physical checklist for the new release. The completed 1.1 device record stays at `docs/DEVICE-ACCEPTANCE.md`. |
| `docs/assets/` | Captures from the built candidate, listed below. |

## Candidate output

The final shell reports 1.2.0 in `meta[name="application-version"]`. Native
IndexedDB reports version 50 (Dexie schema 5). Worker revision
`d8377b92265b069a569b` has SHA-256
`c5a74c317d8f43ddf06dca85def7da303060902371297d80638c776efcad2b23`.
The nine precached files under `/MathHero/` comprise `index.html`,
`manifest.webmanifest`, `favicon.svg`, four PNG icons and two application
bundles. The module illustrations are embedded in the JS.

| Bundle | Raw bytes | Gzip reported by Vite |
| --- | ---: | ---: |
| `assets/index-CPp3sztU.js` | 519,077 | 160.05 kB |
| `assets/index-CympdMgo.css` | 31,834 | 7.58 kB |

The ten distribution files total 588,065 raw bytes, including the worker.
The distribution allowlist confirms source, source maps, the original
attachment, documentation, PNG documentation captures and test fixtures stay
outside `dist/`. Vite emits the stage 4 warning for a minified chunk over
500 kB. The published 1.1 JS was 139.05 kB gzip, so the candidate adds
21.00 kB gzip. Stage 5 changes HTML and manifest metadata, with the accepted
stage 4 application sources and dependencies. Real-device download and
startup remain pending.

## Executed checks

| Command | Local result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | 103 passed across 12 files. |
| `npm run build` | Passed, including base, scope, icon, worker and distribution checks. The final rebuild reproduced the verified worker hash. |
| `npm run test:e2e` | All eight profiles ran. 304 passed, including all 80 column child and parent checks. Two theme cases timed out across a host interruption, and six pre-existing duplicate full-diagnosis cases were skipped. Both timed-out cases passed in the focused run. |
| `npm run test:pwa` | 10 passed in Chromium and WebKit. |
| `npm run test:upgrade` | 12 passed in Chromium and WebKit. Both baseline commits were archived and built with their own lockfiles and reproduced their published worker revisions. |
| `npx playwright test --config .playwright/column-release-captures/playwright.config.ts` | Six capture checks passed against WebKit preview. Both help and history checks passed again with the final compact framing. |
| `git diff --check` and local documentation link audit | Passed. The audit resolved 124 local links and image paths in 27 changed Markdown files. |

The first build after adding the upgrade test found that Playwright's
matcher is `not.toBeChecked()`. This was corrected. The initial Vite config
also used a named import from JSON and emitted a future-config-loader warning.
The config now uses a standard default JSON import.

The first native command stopped before browser execution when registry DNS
failed inside the sandbox. An approved network run installed both archived
lockfiles. In that run the ten existing cases passed and the two new cases
failed on an incorrect assumption that published 1.1 clears paused
multiplication ownership. The check now compares the observed saved v4 rows
byte for byte where applicable. The test also uses the published 1.1 home
link and reads the stored active place for frozen incorrect column feedback.
Two focused upgrade checks and the complete 12-check suite passed after
correction. The initial browser and PWA launches left loopback fixtures
holding ports 4173 and 4174 before any test ran. The stale sessions were
terminated before rerunning the original suites. Playwright retries and skip
configuration were kept at the repository defaults.

In the full browser run, the Chromium tablet-portrait light and dark
`themeVisuals.spec.ts` cases both exceeded their 90-second timeout. Both
traces contain a gap of about 17,791 seconds between test events, from
about 03:11 to 08:08 in Europe/Paris on the trace clocks. The two affected
checks passed on the identical candidate in 6.4 seconds each using
`npm run test:e2e -- tests/browser/themeVisuals.spec.ts --project=chromium-tablet-portrait --output=test-results/stage05-interruption-review`.
The original run, screenshots and traces are retained in
`test-results/stage05-browser-verified.log` and `test-results/browser/`.
The focused run is retained in
`test-results/stage05-browser-interruption-review.log`.
A clean full run on the exact stage commit remains a PR CI gate.

PWA startup samples were taken in desktop browsers on Windows, over local HTTP
loopback, with no throttling. Cold Chromium samples were 207/210/202/216/203 ms
and warm offline samples were 82/76/89/85/75 ms. Cold WebKit samples were
394/392/403/364/383 ms and warm offline samples were 287/236/267/253/230 ms.

## Natural 1.1 update evidence

Both browsers started from the published 1.1 commit
`9309abde58cff9c001e7944f29d2b727965ee093`, worker
`01ee92a8204ef083b478`. The old UI saved multiplication draft `42`,
dark theme, the five-minute goal, disabled animations and a custom PIN.
Two controlled app pages stayed on the 1.1 asset and native v4 store
contents while the actual candidate installed. After the first page closed,
the second still had the waiting registration and its original entry bundle.
Closing the remaining page let the candidate activate. A same-origin
observer outside the worker scope saw activation and removal of the old app
cache. A fresh window then loaded the candidate offline, and the nine cached
response hashes matched the candidate files served during the update.

The first candidate launch was observed at native IndexedDB 50 with all
eight old stores intact and six empty new stores. The custom PIN unlocked
the app, the preferences retained their saved values, and the old
multiplication exercise resumed with `42`. First-time column addition
started offline with three-digit operands, empty cells and no marks. The
test saved two carry ones, entered digits `07`, requested help after an
incorrect check and paused. Closing the page and opening a new offline
window preserved the exact session record, including selected hundreds
place, help exposure and incorrect phase. The same exercise, digits, marks,
error and help action appeared on resume. The candidate's regular worker
performed the update and cache cleanup.

## Screenshots

The three-digit examples and parent data came from replay-valid backups
restored in the app. Dates, times and results are synthetic test fixtures.
The screenshots contain no child identifiers.

Visual review covered the nine documentation images and 48 browser frames
of the home, marked exercises and parent summaries. The browser frames
cover light Spanish and dark Russian on phone and tablet, portrait and
landscape, in Chromium and WebKit. The contact sheets are local artifacts at
`test-results/column-release-visual-review/`. The documentation uses tablet
framing for help and expanded history so their content is visible.

| Capture | Device viewport and presentation |
| --- | --- |
| [Child home](../../assets/child-home-light.png) | Phone portrait, light Spanish. Counters and notebook cards. |
| [Multiplication practice](../../assets/child-practice-dark.png) | Phone portrait, dark Spanish. A question and its keypad. |
| [Addition draft](../../assets/column-addition-light.png) | Phone portrait, light Spanish. `586 + 647` with three carry ones, draft `233` and selected thousands. |
| [Subtraction draft](../../assets/column-subtraction-dark.png) | Phone portrait, dark Russian. `604 − 187` with two borrow dots, draft `17` and selected hundreds. |
| [Incorrect check and help](../../assets/column-help-light.png) | Tablet portrait, light Spanish. The incorrect tens digit and every borrow-through-zero step are visible together. |
| [Column parent summary](../../assets/column-parent-summary-light.png) | Tablet landscape, light Spanish. Accuracy, independent and corrected solves, and help counts. |
| [Column parent history](../../assets/column-parent-history-dark.png) | Tablet landscape, dark Russian. An unfinished example, incorrect check, observed mismatch, later help and active time. |
| [Multiplication parent overview](../../assets/parent-overview-light.png) | Tablet landscape, light Russian. Synthetic knowledge counts and stars. |
| [Multiplication parent map](../../assets/parent-map-dark.png) | Tablet landscape, dark Spanish. Selected `9 × 9` and delayed retention evidence. |

## Outstanding release acceptance

Stage PR review and CI, integration acceptance, main and Pages publication
and live HTTPS verification are coordinator work. The coordinator's
`.playwright/column-live-smoke.mjs` was supplied as a syntax-checked tool
for after publication. It has no execution result from this stage. Rebuild
the accepted release, compare its revision, worker and precached hashes to
the public site, then run the public smoke after Pages finishes. Record CI
and live observations in the [delivery record](../../DELIVERY-COLUMN-ARITHMETIC.md).

Physical iPhone and iPad results for 1.2 are pending in the
[device checklist](../../DEVICE-ACCEPTANCE-1.2.md). This handoff reports
desktop browser automation and screenshots from emulated viewports.

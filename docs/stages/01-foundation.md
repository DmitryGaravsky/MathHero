# Stage 1 — interface foundation

Date: 15 November 2026, Europe/Paris.
Worker status at handoff: implemented and locally verified; coordinator acceptance
is recorded separately in DELIVERY.md. The worker made no commits, push or
deployment and preserved the coordinator's DELIVERY.md changes.

## Delivered

- React 19.3.1, TypeScript 6.0.3, Vite 8.3.8, lockfile, strict type checking,
  ESLint, Vitest 5.1.0, Testing Library, and Playwright 1.65.1.
- Five screens: Home, practice input playground, Results, Table Map, and Settings.
  Hash navigation supports browser Back and direct links on static hosting.
- RU/ES in separate JSON dictionaries with typed keys/interpolation; Spanish is
  the default. Switching updates html.lang and is available on every screen.
- Original SVG space fox, no external images/fonts, a calm space theme,
  responsive cards, phone bottom navigation, and a wide-screen side panel.
- viewport-fit=cover, safe-area CSS variables, buttons at least 52 px high,
  visible keyboard focus, skip link, input labels, live feedback, reduced motion.
- Custom keypad, physical keyboard, and native input with inputMode=numeric.
  Input accepts up to three ASCII digits, supports deletion and Enter, prevents
  empty submission, resets for another try, and survives keyboard-mode changes.
- Switching to the system keyboard uses flushSync before focus within the user
  gesture so Safari sees the new inputMode. Enter on a keypad button confirms
  once; Enter on a mode control retains native button behavior. The editable
  input handles its own keyboard events without duplicate form processing.
- Animations default on and can be disabled by preference or reduced motion;
  sound defaults off. Preferences were intentionally in memory at this stage,
  with that limitation stated in the preview UI.
- React-independent Exercise, ExerciseEngine, Clock and RandomSource contracts.
  No mathematical-engine implementation was claimed at this stage.
- Vite base /MathHero/; dist contained only HTML, CSS, JS and favicon.

## Honest preview boundaries

Practice was an explicitly labeled input playground with 7 x 8. It echoed the
entered number without evaluating knowledge, timing answers, granting stars or
recording history. Home displayed zero stars and no mastery estimate. Results
were empty; the map showed 144 untested cells without invented levels/history.
Difficult-fact practice was an informational placeholder.

The specification calls for five sections but enumerates four in its initial
list. Settings, described later in the specification, became the fifth section.
Hash navigation was chosen for Pages compatibility. Language/preferences were
scheduled to move directly into IndexedDB, without temporary localStorage.

## Added or changed files

- Root: package.json, package-lock.json, index.html, tsconfig.json,
  vite.config.ts, eslint.config.js, playwright.config.ts, README.md.
- public/favicon.svg; src/main.tsx.
- src/app: App.tsx, AppContext.ts, i18n.ts, providers.tsx, router.ts.
- src/components/layout: LanguageSwitcher.tsx, Navigation.tsx.
- src/components/mascot/Mascot.tsx.
- src/components/ui: Icon.tsx, NumericKeypad.tsx, PageHeading.tsx.
- src/features: dashboard/Dashboard.tsx, training/Training.tsx,
  training/answerInput.ts, statistics/Statistics.tsx,
  multiplication/MultiplicationMap.tsx, settings/Settings.tsx.
- src/engine/core/Exercise.ts.
- src/locales/es.json and ru.json; src/styles/global.css and responsive.css.
- tests/setup.ts, tests/foundation.test.tsx, tests/browser/foundation.spec.ts.
- This handoff, docs/stages/01-foundation.md.

## Actually executed checks

Environment: Windows PowerShell, Node 24.22.1, npm 11.19.1.

| Check | Actual result |
| --- | --- |
| npm view version/engines/peerDependencies metadata | Main dependency versions and Node 24 compatibility checked |
| npm install | Installed dependencies and produced lockfile; initial audit issue resolved below |
| npm ci | Clean installation from final lockfile: 229 packages, zero vulnerabilities |
| npm run browsers:install | Chromium 159.0.8154.6 / revision 1255 and WebKit 27.2 / revision 2388 installed |
| npm run typecheck, also included in build | Passed |
| npm run lint | Passed without findings |
| npm test | 6 tests passed in one file |
| npm run build | Passed; HTML 0.57 kB, CSS 14.08 kB, JS 242.40 kB; JS gzip 76.47 kB |
| Final npm run test:e2e | 32/32 passed, 24.2 seconds, two workers, zero retries |
| dist/index.html and output-tree inspection | Links use /MathHero/; specification/source documents absent |
| git diff --check | Passed |
| PNG inspection | Phone/WebKit Home, tablet landscape/Chromium Home, phone portrait and landscape input; initial keypad overlap fixed |

Playwright matrix: Chromium and WebKit, each at 390x844, 844x390, 820x1180,
1180x820 with mobile/touch emulation and deviceScaleFactor 2. Every profile checks
five screens in RU/ES, no horizontal overflow, buttons/navigation at least 52 px,
keypad, physical input without duplicate digits, erase, Enter with input and
keypad-button focus, the system-input path, focus/inputMode, answer length,
empty submission, Back, reduced motion, 144 empty cells and no JavaScript errors.
At 390x844 it also checks that confirmation is above bottom navigation on entry.
Eight screenshot scenarios support visual inspection; they are not pixel-diff tests.

Component/unit coverage: matching locale keys/placeholders, Spanish default and
language change, keypad/erase/submit/retry, physical/system input without double
handling, normalization, and animation settings.

Ignored local artifacts: playwright-report/index.html and
 test-results/foundation-captures-the-foundation-for-visual-review-*/home.png
and training.png. Playwright's preview server was stopped after testing.

## Dependency and environment findings

- Latest TypeScript was 7.0.2, while typescript-eslint 8.72.2 supported <6.1.0.
  Version 6.0.3 was pinned. No --force or --legacy-peer-deps was used.
- Initial audit reported seven moderate records in the lint dependency chain,
  all caused by one minimatch advisory. The scoped override
  @typescript-eslint/typescript-estree -> minimatch 11.0.1 addressed
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
  Engines, exports and the consumed API were checked; lint passed afterward.
  The final clean npm ci reported zero vulnerabilities.
- Dependencies/browsers were installed using ordinary require_escalated.
  The initial sandbox Playwright run never reached tests while awaiting preview
  and was stopped. Escalated runs passed; no sandbox success was claimed.
- Running npm ci while preview still held Rolldown's native binding produced
  Windows EPERM. After stopping the owned server, clean installation succeeded.
  System policies and permissions were not changed.
- Compatibility sources: [Vite](https://vite.dev/guide/),
  [Vitest](https://vitest.dev/guide/),
  [Playwright browsers](https://playwright.dev/docs/browsers), official npm metadata.

## Not yet verified or implemented at this stage

- No physical iPhone/iPad testing. Windows WebKit is not device Safari.
  Actual system-keyboard opening, visual viewport behavior and nonzero safe-area
  insets remain for device acceptance. Automation checked DOM/inputMode, focus
  and input; safe-area CSS was present without a device acceptance claim.
- Short landscape permits vertical scrolling. Tested profiles have no horizontal
  overflow. The entire practice screen is not claimed to fit every phone size or
  the viewport with the system keyboard open.
- No engine, complete diagnosis, adaptation, sessions, IndexedDB, backup, actual
  statistics/rewards, interactive fact history, PWA or deployment yet.
- Startup <=3 seconds was not measured on physical hardware/network.
- GitHub Actions were not created or selected; current supported actions and
  dist-only publishing must be checked in stage 5.

## Integration for stage 2

1. Implement independent engine/multiplication and engine/sessions against the
   core contracts, injecting clocks and RNG.
2. Replace the playground with session presentation while preserving the tested
   keypad/input rules. Keep algorithms and mastery out of JSX.
3. Connect 144 directions / 78 pairs / 6x24 diagnosis, minimal IndexedDB and
   session recovery, excluding background time.
4. AppContext is the preferences boundary: add repository loading/persistence,
   preserving ES / sound off / animations on / ten-minute defaults.
5. Replace empty Home/Results/Map values only with actual data. The 144 visual
   cells alone do not establish a complete mathematical catalog; stage 2 does.
6. Remove preview messages as features become real and update tests to exercise
   diagnosis rather than the temporary playground.

The coordinator owns review, acceptance records, chat IDs and Git checkpoints.
The stage worker did not start the next stage. This historical report describes
stage 1; later-stage reports describe subsequent implementation.

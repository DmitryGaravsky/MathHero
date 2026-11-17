# Stage 3 — child column arithmetic

Status — implemented in the shared stage branch and submitted for coordinator review.
This report records browser emulation and local checks. Physical iPhone and iPad
acceptance remains open.

## Changed files

| Area | Files and behavior |
| --- | --- |
| Home and app shell | `src/features/child/ChildHome.tsx`, `ModuleArt.tsx`, `ChildAchievements.tsx`, `src/app/App.tsx`, `router.ts` and `ModeShells.tsx` add the approved counters and notebook cards, multiplication-specific labels, and routes for the column chooser and each operation. The child return route survives the parent gate. |
| Child practice | `src/features/column/` adds the chooser, operation screen, positional exercise, reusable controller, lifecycle adapter, and worked explanations. It uses the existing engine and exact repository writes. |
| Shared controls and presentation | `Navigation.tsx`, `NumericKeypad.tsx`, `Training.tsx`, `src/main.tsx`, `src/styles/child.css`, `column.css`, `global.css` and both locale catalogs update labels and reuse the keypad and theme tokens. The greeting fox and its reduced-motion behavior move to the multiplication start screen. |
| Verification | `tests/columnController.test.ts` injects clocks, feedback scheduling and delayed repository work. `tests/support/columnFixtures.ts` builds validated v3 fixtures from the approved seeds with distinct session IDs and global journal order. `tests/browser/columnExperience.spec.ts` imports them through the backup UI. Existing child, learning, parent, backup, foundation, theme and PWA checks follow the new home and multiplication entry screens. |
| Documentation | `docs/architecture/COLUMN-ARITHMETIC.md`, `APPLICATION_STRUCTURE.md` and `docs/user/CHILD_GUIDE.md` document practice and persistence behavior. |

## Child behavior and implementation decisions

- Home offers two peer full-card links. Selecting Addition or Subtraction is
  the deliberate entry action. The operation shortcut uses a one-use in-memory
  intent, so an operation URL, reload or return from parent mode observes
  the durable state and waits for Start or Resume. The multiplication route
  stays at `#training`, and the navigation label identifies it as Tables.
- Each operation retains its controller across child routes and modes. It
  serializes exact token writes, coalesces optimistic edits and drains them
  through release after detach. A quick reentry into the same operation
  queues its read and claim behind the release. The current foreground
  guard checks visibility and the original route.
- Answer timing begins after the active UI is committed. Stopping the timer
  before release or a command excludes feedback, the open help panel and
  background time. Correct feedback schedules 800 ms advancement for the
  original owned check. Recovered feedback requires Next. Rival owners and
  restores invalidate the exact version. Read-only recovery precedes
  any deliberate resume.
- Touch and keyboard input share the same positional edits. Focus selects the
  place, and typing moves selection one place left. Enter checks from the
  exercise surface. Keypad, note and unrelated action buttons retain native
  keyboard activation.
- Skip and End are on the paused screen to keep Pause and Save and exit easy
  to find on the active exercise. Their exact paused snapshot must remain
  unowned before the controller claims it and applies the chosen action.
  In phone landscape, the board, keypad and help fit above the fold. Pause
  and Save and exit sit immediately below and are reachable by scrolling.
- Manual notes stay in the draft. Help commits separately before the panel
  appears. The panel closes on pause, and committed exposure survives
  resume and backup. An immediate process exit can interrupt an in-flight
  transaction. Reopening recovers the last committed checkpoint.

## Verification evidence

| Command | Result |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Passed. |
| `npm test` | 98 passed in 11 files, including eight controller tests. |
| `npm run build` | Passed. The scope and base are `/MathHero/`. Candidate worker `c71404ede95732bb427c` precaches nine application assets. |
| `npm run test:e2e` | 280 passed, including all 56 column checks in eight profiles. Six existing duplicate-diagnosis cases were skipped. Two WebKit phone-landscape theme checks timed out during host suspension and passed in the focused run below. |
| `npm run test:pwa` | 10 passed in Chromium and WebKit. |
| `npm run test:upgrade` | 10 passed in Chromium and WebKit against the two published baselines. All six column stores were empty before operation selection, and the preserved multiplication state and legacy imports were verified. |
| `npm run test:e2e -- tests/browser/themeVisuals.spec.ts --project=webkit-phone-landscape --output=test-results/column-stage3-theme-verification --reporter=list` | Both theme checks passed on the same candidate build after the host suspension. |
| Focused wrong-answer capture | Passed on Chromium phone portrait and tablet portrait. The original feedback, committed help and paused state were checked during capture. |

The browser cases use Chromium and WebKit in phone portrait, phone landscape,
tablet portrait and tablet landscape. They exercise both operation entry paths,
all five fixed examples, a full six-example session, skip and early finish,
rapid input followed by save or PIN cover, offline resumption of both marked
drafts, explicit zeros, incorrect feedback, sticky help, exact first-check
evidence and competing ownership. They measure board and keypad targets at
44 CSS px or more, check horizontal overflow, and require the keypad and
hint control to fit in the initial practice viewport. The fixture comes
from journal replay and is imported by the ordinary v3 backup flow.

The first full browser run was interrupted after identifying three existing
tests that still looked for the former home mascot. The multiplication
ready screen now carries the greeting state and its animation. The tests
exercise that state at its new route and retain the thinking, happy and
support checks, the preference persistence checks and the reduced-motion
assertion. The reduced-motion check also verifies animation when the
preference is lifted.

During the subsequent full run, the host suspended while the light and dark
theme tests were active in WebKit phone landscape. Both reported a 90-second
timeout with about 1.9 hours of wall time. The Playwright process continued
with the tablet profiles after the interruption. The affected tests are
identified in the full Playwright report at `playwright-report/index.html`.
The focused run passed both in 15.3 seconds and saved the replacement
captures under `test-results/column-stage3-theme-verification/`.

### Local screenshots

Visual review covered 32 home and marked-draft captures across the eight
profiles, plus the actual incorrect feedback, worked explanation and pause.

- The full-size home and marked-draft captures are under
  `test-results/browser/columnExperience-*/`. Each browser profile has
  `home-light-es.png`, `home-dark-ru.png`, `addition-233-light-es.png` and
  `subtraction-17-dark-ru.png`. Per-profile contact sheets are under
  `test-results/column-stage3-review/`.
- The tablet portrait incorrect response with all three borrow-through-zero
  steps is at
  `test-results/column-stage3-details-tablet/columnExperience-incorrect-c07c4-serves-first-check-evidence-chromium-tablet-portrait/subtraction-wrong-with-help-es.png`.
- The phone portrait paused state is at
  `test-results/column-stage3-details/columnExperience-incorrect-c07c4-serves-first-check-evidence-chromium-phone-portrait/subtraction-paused-es.png`.

## Stage 4 integration

The parent module can read `columnSessions`, `columnAttempts`,
`columnProgress` and `columnJournal` from the existing stores, keyed by
operation. `ColumnAttempt.ordinal` resolves to the issued selection in the
session order. Recorded checks distinguish correctness, first check, hint
exposure, independence and the first mismatch. Use comparable operation and
regrouping patterns for active-time summaries. Existing multiplication
analytics and rewards remain on their published data paths.

The coordinator owns stage acceptance and publication. Parent analytics and
physical device acceptance are still required for the release.

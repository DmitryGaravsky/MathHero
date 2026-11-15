# Math Hero — delivery and acceptance

Prepared on 15 November 2026 (Europe/Paris).

## Coordination

The coordinating chat creates one separate project chat per development stage,
provides requirements and acceptance criteria, waits for implementation, reviews
code and verification evidence, and requests corrections in that stage's chat.
The next stage starts only after acceptance. One implementation stage at a time
uses this shared checkout. The user does not need to transfer messages or run
computer-based checks manually.

Each stage leaves an English handoff in `docs/stages/`, including actual checks,
results, limitations, and integration contracts. Accepted states are committed
and pushed. Implemented, verified, and accepted are distinct statuses.

Execution uses the local computer. The computer and Codex must remain available
while work runs. If execution stops, resume from these records and chat history;
there is no promise of unattended continuation after shutdown or a finished chat.

## Stages

| Stage | Deliverable | Acceptance focus | Status / chat |
| --- | --- | --- | --- |
| 1. Foundation | React/TS/Vite, modules, responsive UI, RU/ES, keypad, basic design | Lockfile installation, build/types/lint, locale and input behavior, phone/tablet sizes and orientations | Accepted / 01a1df4d-4dc0-7421-9979-1957f6b44ec5 |
| 2. Engine and diagnosis | 144 directions, 78 pairs, independent engine, resumable 6 x 24 diagnosis | Complete products and canonical IDs, no omissions/duplicates, active timing, transactional persistence | Accepted / 01a1df5b-f451-77c1-a445-ed3dab9722e4 |
| 3. Adaptation | Difficulty priority, error repetition, intervals, mastery | Reproducible A/B/C profiles, slow-correct distinction, stability across days, diversity | Accepted / 01a1df6d-fae1-7953-a48a-e6d5a357b668 |
| 4. Progress and data | Analytics, 12 x 12 map, rewards, complete storage and backups | History, valid/corrupt import, rollback, migration, no duplicate rewards | Accepted / 01a1df84-bbcf-7481-a4c9-ee99f74ca714 |
| 5. PWA and release | Manifest/icons, offline worker, CI/Pages, English documentation | Full regression, deployed HTTPS/base path, offline/update behavior, documentation/comment audit; device checklist | Not started |

The five stages follow the original specification. Minimal IndexedDB persistence
was brought forward to stage 2 to make diagnosis resumable; complete data tools
and backup belong to stage 4. Stage 1 avoided complex animation in favor of
architecture and input quality.

## Resolved ambiguities

- Offline operation is mandatory: section 11 and the Definition of Done clarify
  the optional wording in section 10.4. It is delivered in stage 5.
- 144 directed exercises and 78 canonical pairs are distinct. Keep directed
  histories while sharing pair evidence; an untested direction is not mastered.
- The 100-mastered achievement counts directed cells out of 144. Clearly label
  directed facts and unique pairs in statistics.
- Mastery thresholds are configurable pilot hypotheses. Stage 3 defines the
  evidence/error windows, local calendar days, sessions, and direction checks.
- A child may finish early. Ten minutes is a soft goal, never forced waiting.
- The custom keypad is primary; physical and system-keyboard paths must work
  without double input. Real system-keyboard behavior still requires devices.
- Startup within three seconds needs a stated device/network and measurement;
  a successful build alone does not establish this criterion.

## Environment

- The workspace was initially empty, without a Git repository. Local main and
  origin now exist; origin is https://github.com/DmitryGaravsky/MathHero.
- Node 24.22.1, npm 11.19.1, Git 2.51.1.windows.1, and GitHub CLI are installed.
- GitHub CLI authentication for DmitryGaravsky works outside sandbox network
  restrictions, including repo/workflow scopes. The initial sandbox auth error
  did not indicate invalid real credentials.
- The global npm registry points to unavailable npmproxy. Project `.npmrc`
  selects https://registry.npmjs.org without modifying other projects.
- Sandbox networking/DNS is restricted. Standard approved escalation works for
  npm, GitHub and browser tests. No policy bypass or Full access change is needed.
- Chromium and WebKit were installed and successfully exercised in stage 1.
  Stop owned preview processes before npm ci on Windows to avoid locked bindings.
- The user chose unsigned commits for this repository: local
  `commit.gpgsign=false`. Global signing preferences are preserved. Commits use
  the repository-local GitHub noreply identity.

## User decisions and authorization

1. The user supplied the empty public repository
   https://github.com/DmitryGaravsky/MathHero and selected the MIT license.
2. Both iPhone and iPad are available. The user will perform physical-device
   acceptance after implementation and automated verification are complete.
3. Unsigned commits are authorized for MathHero only.
4. All repository documentation and source-code comments must be English by
   completion. New documents are English; older reports and the specification
   must be translated during finalization. The product remains localized RU/ES.
5. The request covers the complete development and GitHub Pages release workflow.
   Prepare and verify the app before release; do not repeatedly ask for approval
   of already authorized routine actions. Do not introduce paid services.

## Acceptance evidence

### Stage 1 — commit 21c926e

Reviewed input code, localization, routing, tests, and handoff. Inspected phone
and tablet screenshots. The coordinator's inputMode/focus ordering finding was
fixed. Final results: 6 unit/component and 32 browser tests passed; build,
typecheck, lint, and npm ci succeeded. Keypad overlap was fixed. No real-device
acceptance is claimed.

### Stage 2 — commit d89d68a

Reviewed the engine, timer/controller, repositories, and tests. Late load/claim
ownership and unnecessary paused checkpoints were fixed. Passed 22 unit/component
and 58 browser checks, with 6 intentional redundant full-flow skips. Full 144/144
flows passed in Chromium and WebKit. The final answer-display change passed 16
input/screenshot checks. Inspected the active question UI; build/types/lint passed.

### Stage 3 — commit a59ba50

Reviewed scheduling, mastery, session persistence, and tests. Fixed local-day
handling, confirmed mastery, preservation of early-review due dates, and the
continuous-error repetition cycle. Passed 44 unit/repository tests, 90 browser
tests (6 intentional skips), and a final 24-test UI subset. Build/types/lint passed.
Reproducible 90-day profiles: A mastered 78 pairs; B remained accurate but slow
without mastery; C's three gaps received priority while the other 75 pairs
reached mastery. See the English stage handoff for parameters and actual metrics.

### Stage 4

Reviewed map accessibility, analytics, the reward ledger, backup validation and
v3 migration. Fixed reward processing to avoid lifetime-history replay on each
answer, retention-cycle deduplication, equal-timestamp migration order, WebKit
keyboard focus, and decorative UTF-8 text. Inspected phone map and tablet
analytics screenshots. Passed 54 unit/repository tests and 114 browser tests
(6 intentional redundant diagnosis skips); build/typecheck/lint passed. Tests
include a 2160-answer history, corrupted backup rejection, cancellation, atomic
rollback, repeat restore, draft resume, stale owners and v1/v2 migration. The
fake IndexedDB timing is not a physical-device performance claim. Older stage
reports and this delivery log have been translated to English.

## MVP Definition of Done — 13 of 16 verified so far

- [x] All 144 directed exercises exist.
- [x] Transposed factors share canonical identities and pair evidence.
- [x] Initial diagnosis works.
- [x] Adaptive practice works.
- [x] Error repetition works.
- [x] Spaced repetition works.
- [x] Accuracy and response speed are separate.
- [x] Confirmed mastery is implemented.
- [x] RU and ES work; new screens require regression coverage.
- [x] Complete statistics screen works.
- [x] Interactive 12 x 12 table map works.
- [x] Data persists in IndexedDB; new entities require regression coverage.
- [x] Backup export/import works.
- [ ] PWA caching supports offline operation.
- [ ] Physical iPhone and iPad acceptance completed by the user.
- [ ] GitHub Actions automatically publishes the app.

Additional final gate: all repository documentation and code comments are English.

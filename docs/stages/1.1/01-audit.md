# MathHero 1.1 stage 1 — baseline audit

Status — historical 1.1 baseline audit. For the implemented release behavior,
see the [current documentation](../../README.md). The 1.1 acceptance checklist
remains open. The audit covers `v1.1/01-audit` at `eb27960` on 15 November
2026 (Europe/Paris). The release-planning record names `3367eb9` as the
baseline and `923d1f6` as the published app. The committed differences from
`923d1f6` to the audited revision are documentation only.

## Screen and capability inventory

The app is a single Vite page with a hash router. Every route shares the same
header, language switcher, skip link, footer, and five-link navigation.
`App.tsx` selects and focuses the main view. `router.ts` parses the hash.
An empty or unknown path falls back to `#home`. Neither mode gating nor theme
selection exists at this baseline.

| Route or state | Code and current behavior | 1.1 destination |
| --- | --- | --- |
| `#home` | `Dashboard` shows the daily start/resume link, diagnosis start/resume/results, soft daily goal, stars, mastered pairs and directed cells, achievements, and weak practice. | Child home gets a single primary practice action and concise progress. Parent overview gets the indicators and management links. |
| `#training` | `Training` and `useDiagnostic` use an adaptive `LearningRepository`. Intro/start, running question, feedback, paused draft, early finish, and completion are states of this route. | Daily practice is the child entry point. |
| `#weak`, `#weak?pair=<id>` | The same practice UI uses weak mode, optionally targeted to a canonical pair. Map and weak-fact links canonicalize the pair, including transposed directions. Unknown pair IDs resolve to untargeted weak practice. | Keep general and targeted weak practice available from parent management. |
| `#diagnostic` | The shared practice UI loads the single baseline diagnosis. It adds part breaks and a final link to results. | Keep assessment and completion in the parent flow. |
| In-session states | `Training` renders loading, storage error/retry, empty intro, paused/resume, question, feedback, part break, and complete. It supports the custom keypad, editable input, physical keys, and a per-view system numeric keyboard toggle. Both correct and incorrect feedback currently require Next or View Summary. A voluntary early finish remains available in learning. | Keep recovery and all keyboard paths. Add automatic correct-answer continuation and deliberate incorrect-answer continuation. |
| Training result | `LearningSummary` shows current session score, stars, unlocked achievements, accuracy, mean/median correct-answer time, improved pairs, and new mastery. Finish returns home and New Session starts the next practice. The same summary is reused in results. | Keep child score, improvement, rewards, and continuation concise. Keep speed and history available to parents. |
| `#results` | `Statistics` combines the latest learning summary, `Achievements`, expandable `ParentAnalytics`, and diagnosis status/accuracy/speed. `ParentAnalytics` covers practice accuracy, correct-only speed, daily trends, weak facts, and expandable session and attempt history. `History` renders localized date/time, result and response time. | Parent overview and expandable details. Child gets a dedicated visual achievements destination. |
| `#map` | `MultiplicationMap` has a 12 × 12 directed grid, focus navigation, factor selectors, five labeled states, selected fact and pair histories, and targeted practice. | Parent progress and weak spots. Preserve the map, selection and keyboard affordances. |
| `#settings` | `Settings` contains language, animation toggle, daily goal (5/10/15 minutes), a read-only sound-off indicator, and privacy text. `BackupControls` exports, picks and validates a JSON file, confirms replacement, and reports the outcome. `OfflineSettings` reports readiness, installation guidance, waiting update, or unavailability. | Parent preferences and data tools, plus PIN and theme. Keep language switching available in child mode. |
| Shared shell and controls | `Navigation`, `LanguageSwitcher`, `PageHeading`, `Icon`, `NumericKeypad`, and `Mascot` with idle/thinking/happy/support drawings. `global.css` and `responsive.css` handle styling, safe areas, phone/tablet layouts, reduced motion, and sticky practice UI. | Reuse controls and rendering across the two shells and both themes. |
| Launch/install/update | `main.tsx` mounts React and starts `pwa/register.ts`. Production registers a scoped worker, and `manifest.webmanifest`, icons and the Apple touch icon support installation. | Preserve offline practice, update waiting, scope, and explicit distribution allowlist. |

## Documentation inventory

| Path | Status at audit | Stage 6 treatment |
| --- | --- | --- |
| `AGENTS.md` | Active repository instructions, including user decisions and stage coordination. | Keep coordinator-owned instructions aligned with delivery. |
| `README.md` | Active MVP overview and mixed user, developer, architecture, and release guidance. Its published-app description refers to the MVP. | Use a short entry point with screenshots, status, live app, privacy, and links to focused documents. |
| `docs/specification.txt` | Original 18-section MVP specification, already translated into English. It remains the inherited product reference where later requirements or recorded decisions do not supersede it. The future-operation proposals, lowercase repo name, GitHub Actions sample, early schema diagrams, and example parameters describe the original proposal. | Preserve the original text. Label it as the MVP specification and point to 1.1 and the current implementation guides for superseded material. |
| `docs/product/REQUIREMENTS-1.1.md` | Active 1.1 product specification. Outside-repository source attachment translated here, with subsequent decisions identified separately. | Link as the requirements source. Use the implemented-features document for release capabilities. |
| `docs/DELIVERY-1.1.md` | Active release and coordinator acceptance record. | Coordinator records evidence, actual chats, PRs and release state. |
| `docs/DELIVERY.md` | Historical MVP delivery, resolved ambiguities, release evidence and pending physical-device gate. | Retain and clearly label MVP history. |
| `docs/DEVICE-ACCEPTANCE.md` | Active hardware checklist for the previous flow. The historical record lacks a complete device/OS matrix. | Update for the two shells, PIN, themes, and the exercise/feedback transitions while preserving hardware outcomes separately. |
| `docs/stages/01-foundation.md` | Historical foundation record, including preview capabilities and limitations later replaced by working screens. | Retain as history. Preview-only statements are obsolete for the current app. |
| `docs/stages/02-engine-diagnostics.md` | Historical engine/diagnosis handoff. Its v1 database layout is migration evidence. | Retain as history. Link to current schema and diagnosis documentation. |
| `docs/stages/03-adaptive-learning.md` | Historical stage handoff with the closest existing description of learning policy v1. Its v2 storage details and pre-reward limits are obsolete for the current app. | Move current rules into pedagogy/engine guides and preserve this stage snapshot. |
| `docs/stages/04-progress-backup.md` | Historical handoff with current v3 storage and backup v1 contracts at the baseline. | Keep as history and document the implemented release contracts centrally. |
| `docs/stages/05-pwa-release.md` | Historical MVP PWA/Pages release evidence. Caching and publication assumptions still apply at the baseline. | Keep as history, link current installation and release instructions. |
| `docs/stages/1.1/01-audit.md` | Current stage evidence and baseline behavior snapshot. | Preserve the audit for regression and stage acceptance. |
| `LICENSE` and `.github/workflows/deploy.yml` | Active MIT legal text and executable CI/Pages procedure. | Keep the license and verify release instructions against the workflow. |

No standalone obsolete Markdown draft was found. Obsolete passages are
embedded in the original specification and historical stage snapshots. The
source attachment stays outside the repository and `dist/`.

## Architecture, dependencies, and technical debt

The baseline data path is `Training` → `useDiagnostic` →
`DiagnosticController` → diagnostic or learning repository → engine/Dexie.
The engine imports neither React, DOM, nor database code. Math, scheduling,
progress transitions and replay are behind UI-independent boundaries.
Production adapters inject wall time and randomness. `ActiveTimer` uses a
separate monotonic clock. A TypeScript import-resolution scan of the 45
`src` TypeScript/TSX files found 153 local static edges, including type-only
edges, and no cycles. Acyclic cross-layer dependencies still matter here.

| Priority / stage | Evidence and risk | Recommended correction |
| --- | --- | --- |
| P0 / 2 | `providers.tsx` subscribes to and writes `db.settings` directly. `AppContext.ts` defines `Preferences` while `db.ts` and `backup.ts` depend on that UI module's type. Defaults live in one object, but accepted keys and goal choices also appear in `backup.ts` and `Settings.tsx`. The provider updates optimistically and signals write errors without reconciling the optimistic value. | Put the settings model, normalization, defaults and allowed values outside React. Use an observable settings repository for reads and transactional writes. Define restore and write-failure behavior. |
| P0 / 2–3 | `App.tsx` keys and mounts `Training` by screen and pair. Unmount detaches its controller. `useDiagnostic.ts` treats DOM visibility and React mount as lifecycle inputs. Replacing a shell without an explicit practice lifecycle risks lost screen state or stale async claims. `DiagnosticController.next()` checks busy/error and attachment but does not independently encode screen visibility. Its current `paused` flag also represents accepted feedback. A delayed automatic action would also use the manual Next path's fresh owner claim. | Define shell activity separately from feedback and manual question pause. Preserve the child route and session identity and coordinate in-flight operations with pause, detach and restore. Apply visibility, phase and owner checks to scheduled advancement, including when another tab has claimed feedback. |
| P0 / 2, 5 | `backup.ts` uses exact keys, literal versions, a comparison against today's default `learningPolicy` (apart from saved zone), and deterministic replay against historical derivatives. Adding a preference or changing policy in place can make existing data impossible to import or export. | Provide explicit compatible decoding, keep stored session policy semantics versioned, and test round trips from the published baseline before evolving the model. |
| P1 / 2–3 | `Training.tsx` handles every screen state, keyboard/focus behavior, all feedback, mode headings and summary actions. It repeats its heading and diagnostic constants (24, 144) and performs diagnostic part/progress arithmetic. `DiagnosticController` serves both modes despite its name and has a default repository import and generic cast. `diagnosticRepository.ts` and `learningRepository.ts` repeat owner/cursor/phase and checkpoint checks. | Clarify controller and lifecycle boundaries, reuse engine constants and pure derivations when editing practice, and extract views along actual reuse. Keep distinct write transactions. |
| P1 / 4 | `useProgressData.ts` and `useLearningData.ts` in `database/` combine React subscriptions with Dexie reads and derivations. `Statistics`, nested `ParentAnalytics`, and `LearningSummary` each subscribe to a full progress snapshot. `Dashboard` also reads pair progress through both hooks. `analytics.ts` repeatedly filters lifetime attempts for directions and copies daily buckets while building them. The parent details compute even when collapsed. | Give each surface a suitable snapshot or reuse one already read. Keep engine projections pure. Group or index once where needed and measure larger histories before wider changes. |
| P1 / 4–5 | `MultiplicationMap.tsx` constructs IDs and computes `a * b` although the selected fact already contains `expectedAnswer`. `Statistics.tsx`, `ParentAnalytics.tsx` and `LearningSummary.tsx` repeat speed/percentage formatting or summary arithmetic. `directionStatus` applies hard-coded error-window and accuracy defaults beside the learning policy. Map fluency applies to one direction and may follow a single fast diagnosis. Pair fluency and confirmed mastery use different evidence. | Use engine facts and shared calculations. Give child and parent views clear, named semantics. Reconcile evidence defaults during pedagogy work and use locale-aware formatting for dates, numbers and percentages. |
| P1 / 5 | `src/database/rewards.ts` and `src/engine/learning/rewards.ts` implement incremental and replay reward eligibility independently. Both must agree on retention and streaks. `answerLearning` shares evaluation through `answerDiagnostic` by adapting a session shape and changing the returned mode. Diagnostic and learning repositories append the journal independently. | Preserve atomic and bounded writes and replay parity. If changing the policy, share specific pure predicates where that reduces drift. Keep diagnostic evidence isolated. |
| P1 / 4 | `global.css` and `responsive.css` mix semantic styles and literal colors for backgrounds, text, focus, buttons, keypad, overlays and map states. The fox SVG has an artwork palette. There is no user or system theme preference. Locale tables have matching keys and placeholders, but several displays use raw counts, ISO dates or hand-built percentages. | Introduce theme tokens for UI roles and test contrast in both themes across all states. Check visual artwork readability in both themes. Use locale formatting and verify RU/ES in the browser. |
| P1 / 6 | The workflow triggers PR verification only for PRs targeting `main`. Stage PRs target `release/mathhero-1.1` under the release plan. | Use recorded local verification for each stage and confirm how integration PRs receive CI before relying on them for acceptance. Retain the main-only deployment guard. |

No named route component writes IndexedDB directly. `BackupControls` uses the
backup API, and the practice controller uses repositories. Direct database
access exists in the app provider and the React read hooks listed above.
Live progress writes occur in `LearningRepository.submit`. Upgrades and
confirmed full backup restore are the bulk replacement paths. Diagnosis writes
its attempt, journal entry, and session without changing learning progress.

## Baseline learning and practice contracts

- **Identity and diagnosis.** Factors 1–12 form 144 directed IDs
  (`mul:a:b`) and 78 canonical pairs (ordered operands). Directed history and
  shared pair evidence are distinct. One diagnostic, `diagnostic:baseline:v1`,
  shuffles all 144 directions once across six parts of 24. Diagnosis supplies
  a starting difficulty profile (including partially completed attempts).
  Practice evidence supplants that baseline per pair. Diagnosis grants no
  mastery, stars or achievements. Speed statistics use only correct answers.
- **Adaptive selection.** Daily, general weak and targeted weak practice have
  a 24-question budget with four warm-up, sixteen main and four challenge
  questions. Restored sessions keep revealed questions. New selection uses
  pair weights of error 14, due 10, slow 8, unknown 6, developing 3, fluent 1,
  and mastered 0.25, in that precedence for error and due. Familiar warm-up
  prefers fluent pairs (×12). Weak practice and the challenge phase boost
  slow/error pairs (×4). The target opens a targeted session and receives ×20,
  and pairs not yet seen in the session get ×1.5. Resolve the pair into the
  least exposed direction across
  diagnosis and practice, using injected randomness on ties.
- **Diversity and retries.** Ordinary selection excludes the last three pairs,
  avoids repeating the same first factor after two such questions, and limits
  optional non-due mastery checks to two when candidates permit. A standard
  session presents a pair at most four times. An error schedules a repeat at
  ordinal + 3 (two intervening questions). A first correct practice attempt
  schedules ordinal + 5 (four intervening questions). Overdue items remain
  eligible and an end-of-session miss stays due for future practice. The
  repeat queue is persisted. Reversing factors does not bypass spacing.
- **Policy v1.** Recent evidence covers 20 training attempts, at least five
  successes across at least three local calendar days and two sessions, and
  accuracy of at least 95%. The median of the latest 15 correct times in the
  window must be at most 3000 ms. Each direction requires a fast correct
  attempt and its most recent attempt must be correct. Squares require one
  direction. Exclude recent errors in the last five attempts or within seven
  elapsed days. Only new eligible correct evidence confirms `masteredAt`.
  Slow correct responses are successes and can coexist with mastery when the
  complete evidence still qualifies.
- **Reviews.** `intervalIndex=-1` marks an unestablished full interval. Two
  consecutive correct responses with a fast second answer can establish the
  one-day interval. Subsequent interval growth (1/3/7/14/30 elapsed days)
  requires a fast answer at or after the due time on a new local day. Early
  fast reviews keep the due date. A slow correct answer caps the interval at
  one day and can bring the date forward. An error resets the index and makes
  the pair due immediately. The session snapshots its policy and IANA zone.
  Evidence stores day and zone. Changing device zones does not regroup saved
  evidence. The ten-minute default goal is a soft daily target using committed
  active answer time, with early finish supported.
- **Baseline semantics and 1.1 work.** Scheduler difficulty is
  unknown/error/slow/developing/fluent/mastered. The directed map shows
  unknown/difficult/developing/fluent/stable, with a history prerequisite for
  a directed cell. Learning currently stores mastery and review evidence plus
  successful retention reward events, with no separate Learned/Fluent/Retained
  view. Parents see difficult/developing directions with accuracy and speed.
  There is no multi-attempt classification of recurring errors, regressions
  or possible input slips. Preserve the separation of accuracy and speed when
  adding those projections. Keep 3000 ms a policy parameter rather than a
  child-facing timer.

## Storage, migration, and backup contracts

| Version or format | Source-of-truth contract |
| --- | --- |
| Dexie v1 | Database name `math-hero`. `sessions` indexes ID, mode and start. `attempts` indexes ID, session, directed fact, canonical pair, mode, and session/ordinal. `settings` indexes ID. |
| Dexie v2 | Adds `progress`, keyed by canonical pair and indexed by due date and mastery date. Keeps diagnosis/settings. |
| Dexie v3, published baseline | Adds `journal` keyed by attempt ID with a unique commit sequence, `rewards` keyed by deterministic ID and indexed by session and kind, and `rewardState` keyed by ID. v3 creates a journal for old attempts by timestamp, using within-session ordinal and across-session start, sequence and ID for ties. It replays progress, session summaries and repeat queues, and adds reward derivatives. v2 lacks the original order for exactly tied interleaved streams. Normalization preserves source attempts and draft/current exercise. |
| Session schema 1 | A single diagnostic with shuffled order, cursor, phase (question/feedback/break/completed), timestamps, last attempt, owner, draft, and current active elapsed milliseconds. |
| Session schema 2 | Adaptive/weak practice with distinct streams per mode and canonical target, ordered by stream sequence even with equal timestamps. Retains revealed question order, committed ordinal/cursor, draft, checkpoint time, phase, last feedback, pending repeats, saved policy, summary, and completion reason. A completed history entry stays distinct from a new session. |
| Settings at baseline | Optional singleton `preferences`: `language` (ES default, RU), `soundEnabled: false`, `animationsEnabled: true` by default, `dailyGoalMinutes` (5/10/15, default 10). No saved mode, theme or PIN. |
| JSON backup v1, databaseVersion 3 | `format: "math-hero-backup"`, `exportedAt`, and all seven tables. This is the only published backup format at baseline. Earlier Dexie schemas are on-device migration formats. |

**Unfinished sessions.** Each saved attempt uses `sessionId:ordinal`.
Submitting atomically persists the attempt and updated cursor/feedback
before another question appears. The final answer may persist a completion
timestamp while the phase still shows feedback. A revealed question starts
timing after the DOM commits. The timer pauses on answer, manual pause,
visibility loss, pagehide and detach, with a 250 ms question checkpoint
cadence and a save on draft change. Saved time is elapsed monotonic
milliseconds with no serialized timer origin. Reload resumes a saved
question paused and restores feedback/break/completion as appropriate.
Same-tick double submit is guarded before the first await. Writes require
matching owner, cursor and phase. Explicit claim/resume transfers ownership
between views. In-flight generations and attachment checks keep an old
view from taking over a remounted one. An abrupt stop before a checkpoint
commits can lose the newest draft or elapsed slice.

**Rewards.** Learning answer commits include attempt, session, pair progress,
journal, reward ledger and counter/day index. An early finish commits its
session and any completion reward atomically. Journal sequence is global and
append-only for normal answers. Correct answers earn one star regardless of
speed. Every fifth correct answer in a session streak earns one extra.
A nonempty completed session, including early finish, earns two. First
mastery of a pair earns three. A fast correct scheduled review on a different
local day earns five when the pair is mastered before and after the attempt.
The retention ID includes the previous due time to deduplicate that cycle.
Deterministic event IDs prevent duplicate correct, streak, completion,
mastery, retention and achievement entries. Milestones record ten correct
answers, 25/50/100 mastered directed cells, seven distinct practice days,
and all 144 directed cells (78 pairs). They grant no extra stars and remain
earned when current mastery falls. Training writes are incremental and
must remain consistent with journal-order replay.

**Backup.** Export reads a consistent transactional snapshot and validates
it. Import checks structure, versions, known IDs, chronology and links,
session state, settings, and replayed derivatives before offering the
replacement confirmation. It verifies again before transactional clear
and insert. The 20 MB file limit is applied by the UI and the parser has a
20,000,000-character limit. Cancel or validation/write failure leaves
the old data. Successful restore clears owners and replaces the whole
learning dataset. Repeat import replaces reward events and avoids double
awards. Publishing excludes files generated by the backup UI.

**Offline delivery.** Keep the case-sensitive `/MathHero/` base and worker
scope. Installation precaches the built app and icons. A new cache must
install fully, then the worker waits for all old clients to close. A failed
install/update can retry on reconnection, and the worker preserves IndexedDB
and unrelated caches. Only verified `dist/` reaches GitHub Pages.

## Previous-version migration fixture proposal

This is a reproducible recipe for stage 2 and the final regression. The
stage 1 run covered the existing v1/v2 repository migration tests and the
current v3 backup flow. It did not build a release-to-release fixture.

1. Use the published commit
   `923d1f634047322e688eafb38679ad3dba66e1d7` and its committed lockfile to
   build the old app in an isolated directory. Record the commit, production
   worker revision (`7a73513eb82bcfc66d1d`), fixture recipe and browser engine.
   Serve at `/MathHero/` on a local loopback origin reserved for this test.
2. In a new Playwright profile with an explicit time zone, fix the date for
   each synthetic practice day and seed the RNG. Keep the monotonic response
   clock running or control it separately. Drive the **old UI** with scripted
   numeric answers and controlled waits, letting the old Dexie code make native
   IndexedDB stores and records. Produce independent baselines for an empty
   profile, legacy preferences, diagnosis break/feedback, completed practice
   history with rewards, and unfinished adaptive and targeted weak practice
   with draft, elapsed time, feedback or repeat queue. Practice a targeted
   square correctly and quickly over multiple dated sessions to seed
   confirmed mastery, and include a wrong answer and a slow correct answer
   on other pairs. Use separate fixture cases for mutually exclusive phases
   of the same session. Assert that the required legacy records actually
   exist before upgrading.
3. Save the original app's JSON export. Read the old browser's actual database
   version, object-store names, indexes and structured-cloned records, and
   capture a Playwright storage state including IndexedDB where supported. For
   the native upgrade keep the same browser profile and origin. Block service
   workers for a storage-only scenario, then serve the 1.1 build from the same
   origin. Run a worker-enabled update separately using natural activation.
   Run the migration scenario independently in Chromium and WebKit.
4. Compare before/after attempts, IDs, dates, progress, rewards, settings and
   unfinished fields. Verify defaults for new settings, PIN reset without data
   loss, draft/feedback resume without regeneration or duplicate writes, and
   successful re-export. Separately import the legacy backup into a clean 1.1
   database. Check corrupt import, cancellation, rollback, repeat import and
   prevention of stale owner writes. Keep v1/v2 tests. If expanding native
   historical cases, seed the code from `d89d68a` (v1) or `a59ba50` (v2)
   and describe them as pre-publication snapshots.

Commit an automation recipe or reviewed synthetic fixture data as appropriate
for the migration tests. Never use a personal browser profile, a real learner's
history, or the live origin as a writable fixture.

## Prioritized implementation and stage 2 tasks

| Stage | Priority and scope | Review evidence |
| --- | --- | --- |
| 1. Audit | P0. Record requirements, baseline, transition risks, storage contracts and staged work. | Two English deliverables and actual regression results below. |
| 2. Architecture | P0. Centralize settings, split shell/lifecycle responsibilities, add the local mode gate, and establish compatibility before moving screens. Introduce typed theme preference as groundwork for P1. | Route/PIN tests, timing and state continuity, real previous-version data/backup tests, and preserved baseline behavior. |
| 3. Child flow | P0. Short start/resume, simple exercises and feedback, visual achievements, concise result and continue/finish actions. | Cold start, restored question and feedback, rapid activation, hidden/paused feedback, focus and keyboard tests on phone/tablet. |
| 4. Parent flow and themes | P0 parent management, P1 theme and localization. Preserve diagnosis, analytics, history, map and weak practice, settings/data and PWA status. Add tokens and optional bilingual terms. | Management capability inventory against the baseline, system theme changes, contrast and screenshots, RU/ES copy checks. |
| 5. Pedagogy | P0. Explicit Learned/Fluent/Retained evidence, retention in normal sessions and conservative weak-fact/error analytics. | Deterministic A/B/C practice profiles, separate accuracy and speed, derived data and policy replay compatibility, regressions around errors and overdue reviews. |
| 6. Docs and release | P0. Reorganize and label documents, verify English comments/docs and complete tests and migrations. Prepare publication and hardware acceptance with coordinator. | Implemented README screenshots for both modes and themes, current user/developer docs, full regression evidence, Pages scope, and separate physical-device checklist. |

### Stage 2 work in implementation order

1. Extract a typed settings model and a repository used by the provider and
   backup decoder. Centralize defaults and normalization, including
   `ThemePreference` (`system`, `light`, `dark`). Recommend `system` for
   new installations and legacy profiles without a theme preference. Keep
   current user settings.
   Use transactional updates against the latest row and ensure live restore
   repopulates the provider. Pick a schema and export change only if required.
   Teach 1.1 to read backup v1/database v3 before changing exported payloads.
2. Add an in-memory `AppMode` for the unlocked view, distinct from the
   persisted practice `SessionMode`. Retain the current child destination
   on mode entry. Begin each new launch in child mode,
   including reloads and parent hashes. Put the gate in route resolution so
   a hash, history navigation, or targeted practice link cannot enter the
   parent shell without the mode switch. Keep known hashes usable through
   the intended mode, and localize gate copy and errors in ES/RU.
3. Implement the PIN confirmation with default 1234, a validated numeric PIN
   change, and a deliberate reset. Recommended reset behavior is to restore
   the default with an explicit local confirmation. Store a hashed verifier
   for a customized PIN. Recommended storage/backup policy is to keep the
   verifier device-local and preserve it across learning backup restore.
   Verify default/custom success, wrong/cancel paths, direct hashes,
   single-action exit, reload defaults and no progress loss on change/reset.
4. Introduce the child/parent shell and an activity contract for the shared
   session controller. Pause question timing while its owning screen is
   covered or inactive. Preserve the child route, session ID, draft, cursor,
   last feedback and checkpoint. Handle pending start/resume/submit, back
   navigation, reload, PWA update and an explicit backup replacement.
   Invalidate stale view operations when restoring. Preserve session modes
   and repositories. Give stage 3 a reliable way to defer scheduled advance
   while the browser, overlay or shell blocks practice.
5. Exercise the migration fixture above with the selected schema/settings
   design. Add focused cold-start, direct-link, lifecycle, backup and
   storage tests. Keep database handling behind an adapter. Defer polished
   child/parent screens, complete theme styling and pedagogy to their
   assigned stages.

### Recommended interpretations for subsequent stages

- The two-tap budget applies to reaching a new or resumable exercise. A saved
  feedback explanation stays available and waits for the child's action when
  incorrect. Preserve that explanation over shortcutting the flow.
- A correct answer may advance after a short visible confirmation, including
  into a break/summary when appropriate. If a timer expires while hidden,
  paused or in another mode, defer the transition until practice is active.
  Treat restored feedback and simultaneous manual/automatic actions with
  explicit cancellation and session/phase checks. Avoid moving focus or
  starting timing while another screen covers the practice.
- Preserve historical rewards and existing policy interpretation. Stage 5
  can use current attempt evidence and due-review events for knowledge states.
  Any model changes that alter stored derivatives need a compatible replay
  plan. Make input-slip labels tentative and require corroborating history.
- Provide the bilingual terminology option in help or learning material.
  Standard screens use the selected locale throughout.

## Requirement-to-stage verification matrix

Numbers refer to section 11 of the [1.1 specification](../../product/REQUIREMENTS-1.1.md).
Each row describes evidence still required for release acceptance.

| Criterion | Related section | Stage | Verification |
| --- | --- | --- | --- |
| 1. Child default | 2.4 | 2, 3 | Fresh launch, reload from parent, protected old/deep hashes. |
| 2. Start within two taps | 2.2, 5 | 3 | Browser touch flow from cold home to first exercise, existing draft resume and just-finished practice. |
| 3. Child navigation boundary | 2.2–2.3 | 2, 3 | Enumerate links and try direct parent hashes and back/forward. |
| 4. Retain parent management | 2.3 | 4 | Compare each management route/state from the inventory, including targeted drills and offline status. |
| 5. PIN gate | 2.4 | 2 | Correct/incorrect/cancel entry and persistence, change/reset behavior, inspect stored verifier and exercise protected links. |
| 6. One-action return | 2.4 | 2, 4 | Return from parent subpages and restore relevant child screen. |
| 7. Preserve session on switch | 2.4, 5.2, 7.3 | 2, 3 | Draft, feedback, in-flight save and active timing cases before and after mode switch, visibility changes and restart. |
| 8. System/Light/Dark | 3.1–3.2 | 2, 4 | Persist each preference, emulate OS changes during System and verify forced variants. |
| 9. Full theme coverage | 3.2 | 4, 6 | Audit contrast and focus, error, input, map and keypad states in both shells, screen sizes and themes. |
| 10. Complete ES/RU | 6 | 2–6 | Test key/interpolation parity, actual localized renders, numeric/time formats and optional bilingual terms. |
| 11. Multiplication regression | 4.1, 7.3 | 3, 5, 6 | 144/78 coverage, deterministic profiles, weak targeting, scheduling diversity, repeat/feedback behavior and keyboard paths. |
| 12. Diagnosis, intervals, mastery | 4.1–4.5 | 5, 6 | 144/144 diagnosis with pauses and no practice rewards. Confirm exact interval rules, retention and regressions over multiple days and sessions. |
| 13. History and achievements | 4.1, 7.5 | 2–6 | Historical attempts/ledger survive, deterministic reward IDs and matching incremental/replay results, achievements and history visible in their intended flows. |
| 14. Migrate data | 7.5, 9 | 2, 6 | Native upgrade from published v3 fixture, legacy v1/v2 checks, reopened draft/feedback and exact business data comparison. |
| 15. Backup and restore | 7.3, 7.5, 9 | 2, 5, 6 | Previous-format import and current export/restore, cancellation, corruption, rollback, repeated restore and owner invalidation. |
| 16. Automated checks | 9 | 1–6 | Build/types/lint, unit/repository, Chromium/WebKit in four mobile viewports, and PWA offline/update. Record actual skips and results. |
| 17. README and docs | 8.1–8.4 | 6 | Compare rendered app and release instructions to the README, focused docs, screenshots, and English prose/comment audit. |
| 18. Mark obsolete docs | 8.1, 8.5 | 1, 6 | Apply statuses, identify superseded MVP passages and link to the current policy. |
| 19. Document architecture | 7, 8.4 | 2, 6 | Review dependency graph and document responsibilities, data flow, migration choices and settings/backup boundaries. |

## Executed checks

Windows with Node 24.22.1 and npm 11.19.1, using the existing lockfile
installation and Playwright Chromium/WebKit binaries. Browser suites used
fresh Playwright contexts with loopback servers, with `CI=1` to start their
own fixture servers.

| Check | Actual result |
| --- | --- |
| `npm run build` | Passed. Vite production build, generated worker revision `7a73513eb82bcfc66d1d`, 9 precached assets, and distribution allowlist/scope/icon checks passed. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | 54 passed across five files, including engine profiles, ownership/active timing, rewards and v1/v2 migrations in fake IndexedDB. |
| `npm run test:e2e` | 114 passed, 6 intentional skips, 3.3 min. Both browser engines at phone/tablet portrait and landscape sizes. The full 144-answer scenario runs on the phone-portrait project in each engine and skips its other six instances. Existing UI checks cover both locales. |
| `npm run test:pwa` | 10 passed, 25.1 s. Chromium and WebKit each exercised install/offline resume, waiting update/draft preservation, failed update, failed first install, and startup sampling. |
| Read-only import and localization scans | 45 TypeScript/TSX source modules and 153 local static import edges, 0 detected cycles. 171 locale keys in each language, 0 key or interpolation mismatches. This is structural parity evidence. |
| Documentation structure check | 12 numbered specification sections, 19 acceptance criteria, and 19 matching audit matrix rows. Checked local links, Markdown fence balance, encoding and trailing whitespace. |
| Playwright server teardown | Both commands exited successfully. No listeners remained on ports 4173 and 4174. |

Desktop HTTP loopback startup samples, without throttling, measured navigation
to visible practice link. Chromium cold 156–180 ms and warm offline 52–76 ms.
WebKit cold 284–336 ms and warm offline 205–310 ms. Hardware installation,
native keyboards, storage after Safari process restart and the startup target
on a normal connection remain physical iPhone/iPad acceptance work.

## Handoff

- Added `docs/product/REQUIREMENTS-1.1.md` and this audit. The original MVP
  specification and product implementation remain as audited.
- The baseline suite and static checks are complete. A clean dependency
  reinstall, Linux CI, live HTTPS and physical devices were outside this
  baseline run. Previous publication evidence belongs to the MVP delivery record.
- Stage 2 has the specific tasks and fixture recipe above. The native
  published-release-to-1.1 upgrade, mode gate, themes, feedback automation,
  child and parent flows, updated pedagogy, and release acceptance are pending.
  Start implementation after coordinator review.

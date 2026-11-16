# Stage 3 — adaptive learning

Status — historical MVP stage record. See the
[current practice selection](../pedagogy/ADAPTIVE_TRAINING.md) and [mastery policy](../pedagogy/MASTERY_POLICY.md).

Date: 15 November 2026, Europe/Paris.
Worker status: implemented and verified as described below; coordinator acceptance pending.
No commits, push, deployment, additional chats, or agents. The worker did not change
`docs/DELIVERY.md` or `AGENTS.md`; their existing changes belong to the coordinator.
This handoff follows the user's new requirement for English documentation/comments.
Existing Russian documentation will be translated centrally in the final stage.

## Delivered behavior

- React-independent `engine/learning`: difficulty, confirmed mastery, intervals,
  pair/direction selection, and pure session transitions with injected clocks/RNG.
- `#training`: daily adaptive practice. `#weak`: difficult facts. Diagnosis remains
  separately available at `#diagnostic`, from Home and Results. Diagnostic answers
  supply initial difficulty but never count as mastery evidence.
- Standard practice has 24 questions: 1–4 familiar warmup, 5–20 main practice,
  21–24 increased difficult-fact emphasis. Unknown profiles use regular selection
  when there are no familiar candidates. Ten minutes is a soft goal, without a
  countdown, forced waiting, or mandatory duration.
- Reuses validated input, focus behavior, feedback, ActiveTimer, checkpoints, and
  pause/reload lifecycle. Early finish works from an active question, feedback,
  or restored pause. Returning Home preserves an unfinished practice.
- Real summaries: answered/correct counts, accuracy, correct-only median/mean
  response time, observed pair improvements, and pairs mastered during practice.
  Results also shows the latest finished practice separately from diagnosis.
  Home shows the actual number of mastered canonical pairs out of 78.
- Full RU/ES localization; ES default, sound off, animations on remain unchanged.
  Rewards, historical charts, the interactive map, and backup remain out of scope.

## Mastery policy version 1

`src/engine/learning/progress.ts` exports `learningPolicy` and `LearningPolicy`.
Pure functions accept the policy; `createLearning(..., targetPair?, policy?)`
records a snapshot in the session, including time zone and interval array.
There is no end-user threshold editor. These are configurable pilot hypotheses.

All the following conditions are required:

| Condition | Default |
| --- | --- |
| Evidence window | Last **20 training answers** for the pair, including errors |
| Success count | At least **5 correct answers** within that window |
| Stability | Correct answers on **3 calendar days**, in **2 different sessions** |
| Accuracy | Correct / all window answers **>=95%**; with fewer than 20 answers, a single error fails this threshold |
| Speed | Median of the last **15 correct answers within that window**, **<=3000 ms** |
| Recent errors | None in the last **5 answers**, and none within **7 × 24 elapsed hours** |
| Directions | Each direction has a fast correct answer in the window and its latest answer is correct; squares need one direction |

The extra two-session minimum explicitly prevents a single practice stretched
across three days from granting mastery. One orientation cannot master its reverse.
Mastery covers 78 canonical pairs; all 144 directed histories remain in `attempts`.
An error affects only its pair. A slow correct answer increments `correct`, not
`errors`; accuracy and speed stay separate.

Calendar policy: the device's IANA time zone when the application's policy is
created is copied into each session. `calendarDay(at, timeZone)` uses `Intl` to
produce a local `YYYY-MM-DD`. Each evidence item stores **day and timeZone**.
Existing keys are never recalculated after a time-zone change. Reloading the
application picks up the current zone for new sessions; a resumed session keeps
its saved policy. Tests cover UTC midnight within one local day, spring/fall DST
in Europe/Paris, and a subsequent switch to America/New_York. Review intervals
and error age use elapsed milliseconds, separately from local mastery days.

`masteryEvidence` returns `eligible` (thresholds met) and `mastered` (thresholds
plus persisted `masteredAt`). Promotion happens **only on a new correct training
answer** in `updateProgress`. Merely aging past the seven-day error boundary does
not grant mastery. An error or an unsuitable evidence window clears `masteredAt`;
requalification records a new time. Map/rewards must use confirmed status, not
`eligible` alone. Diagnosis cannot write learning evidence.

## Intervals and scheduler

`intervalIndex`: -1 means no established interval; 0..4 represent 1/3/7/14/30 days.
The first success schedules another retrieval after four intervening questions;
if practice ends first, its next review date is one day later. A second fast
success in a correct streak establishes the one-day interval. Later growth by one
step requires a fast correct response **at or after nextReviewAt**, on a different
local day from the last interval increase.

An early fast correct response **preserves the existing due date** and does not
increase the interval. This is tested with daily early practice followed by the
scheduled review. An error resets the index to -1 and makes the pair due now.
A slow correct response caps the index at zero and schedules at most one day;
an early slow response can bring the due date forward but never postpone it.
Even with index -1, a correct answer gets a next-day review date: no established
interval does not mean no review scheduling.

Selection operates on canonical pairs, then chooses the less exposed direction
across baseline plus training history, with injected RNG for ties. The in-session
repeat queue is persisted, so reload preserves pending repetitions.

| State | Base weight |
| --- | ---: |
| Errors | 14 |
| Overdue review | 10 |
| Slow correct | 8 |
| Unchecked | 6 |
| Developing | 3 |
| Fluent with checked directions | 1 |
| Confirmed mastery, not due | 0.25 |

Baseline errors/slowness supply difficulty until the pair has training evidence.
One diagnosed orientation does not mark the entire pair checked. Once training
exists, its evidence determines difficulty. Speed classification uses the median;
an isolated slow answer can shorten the review interval without revoking mastery
if the full window still meets the mastery criteria.

Diversity rules and modifiers:

- Ordinary selection excludes the last three canonical pairs: at least **three
  other questions** between appearances. Reversed operands are the same pair.
- An error is targeted at ordinal + 3: **two intervening questions**. Consecutive
  errors have distinct slots. Questions near the end, or an early finish, leave
  the pair due in progress for future practice instead of extending the session.
- **At most four presentations of a pair per standard practice**, including its
  first question and all repeats. Further targeted repeats are deferred; error
  evidence and high priority remain. This deliberately resolves the conflict
  between repeating every error and avoiding a loop on the first three pairs.
  A continuous-error stress test over 100 questions covers at least 25 pairs.
  Artificial requests long enough to exhaust the catalog can relax the quota;
  production sessions contain only 24 questions.
- After two consecutive questions with the same first multiplier, ordinary
  selection excludes pairs containing that multiplier. Targeted error review
  takes precedence over this secondary table-diversity rule.
- Pairs not yet selected in the practice receive ×1.5. Weak mode and the last
  four questions give errors/slow pairs ×4. Warmup restricts to familiar
  candidates when available, with an additional fluent weight ×12.
- At most two optional non-due mastered checks **while other eligible candidates
  exist**. Overdue mastered pairs remain eligible. If everything available is
  mastered, voluntary practice is still possible.
- No React/DOM in the engine. Production uses Math.random. A revealed question
  is persisted and never reselected by rendering; unseen future questions are
  selected on advance.

## Stage 4 API contracts

- `progress.ts`: `updateProgress`, `masteryEvidence`, `difficulty`, `median`,
  `calendarDay`, `learningPolicy`, `PairProgress`, `Evidence`.
- `scheduler.ts`: `selectNext`, `priority`, `updateRepeats`, `sessionStage`.
- `session.ts`: `createLearning`, `answerLearning`, `advanceLearning`,
  `LearningSession`, and `Session = DiagnosticSession | LearningSession`.
- `app/router.ts`: **`pairTrainingLink(exerciseId)`**, e.g.
  `#weak?pair=mul%3A7%3A8`. Both orientations share a canonical target session.
  Its first question is guaranteed to use that pair. Later selection uses ×20
  target weight, mixed with other pairs; spacing and quota remain in effect.
  An invalid query ID safely falls back to ordinary weak practice.
- `LearningRepository(db?, clock?, random?, mode?, targetPair?, newId?)`:
  `get/start/claim/checkpoint/submit/advance/finish`. `newId` is injectable.
  Session ID: `learning:<uuid>`; attempt ID: `sessionId:ordinal`.
- `DiagnosticController<S>` and `useDiagnostic(mode,targetPair)` now share the
  lifecycle for both session types; historical names preserve compatibility.
  `SessionRepository<S>` is the structural controller contract, with optional finish.

`LearningSession` retains cursor/order/phase/draft/activeMs/owner semantics from
diagnosis, but has `schemaVersion:2`, `mode:adaptive|weak`, `total:24`, and no break.
`order` contains answered questions plus the open question, not a prebuilt set of
24. Added fields: policy, targetPair?, repeats, sequence, endReason, summary.
`sequence` is monotonic per mode+target, so equal wall-clock startedAt values
cannot reorder sessions. There is one unfinished session per mode+target;
adaptive, ordinary weak, and each target can be resumed independently.

`get()` reads without claiming ownership and returns an unfinished or latest
finished session. `start()` after completed creates a new record, retaining older
sessions. The final answer records completedAt/endReason atomically, while the
UI may still be showing feedback before advance. Early finish discards the open
unsubmitted draft without recording it as an answer.

`summary`: answered, correct, correctTimes (at most 24), improvedPairs,
masteredPairs. Improvement means a correct response after the pair's previous
incorrect response, or a fast correct response after a slow one; each pair is
counted once per practice. It is an **observed transition, not durable mastery**.
masteredPairs records pairs that reached confirmed mastery during the session;
a later error may revoke that status. Read progress for current map state.
Stage 4 rewards need their own deduplicated event/ledger rather than treating
this summary as a current-state map or an idempotent reward ledger.

## IndexedDB v2 and atomic writes

Database: `math-hero`, Dexie version 2. Existing v1 stores remain unchanged;
adds `progress: canonicalId, nextReviewAt, masteredAt`. Diagnostic sessions keep
schemaVersion 1; attempts and settings are not rewritten. The migration test
creates an actual v1 database with diagnosis, an attempt, and RU preferences,
then verifies exact preservation after upgrading and writing a learning answer.

`PairProgress`: canonicalId, policyVersion, lifetime attempts/correct/errors,
consecutiveCorrect; last 20 Evidence records; directions containing directed
attempts/correct/lastAttemptAt; lastAttemptAt/lastErrorAt; intervalIndex,
lastIntervalDay, nextReviewAt, masteredAt. Full history stays in attempts,
including mode and exerciseId. Diagnostic attempts never enter learning totals
or mastery evidence.

`submit` writes **attempt + progress + session in one rw transaction**. Protection
includes owner/cursor/phase checks, a unique attempt key, and the controller's
synchronous busy guard. Injected failures in progress or sessions roll back all
three tables. Stale checkpoints, foreign-owner submits, and double submits
cannot create duplicate answers. Claim checks view liveness inside its transaction;
a delayed claim after detach does not steal ownership. Explicit resume in another
tab can transfer ownership; the old view must reload. Concurrent shared practice
is not offered.

ActiveTimer/lifecycle from stage 2: performance.now, starts after question DOM
commit, pauses on manual pause/hidden/pagehide/beforeunload/detach, checkpoints
every 250 ms only during an active question. Reload opens a question paused;
feedback restores as feedback. Background wall time is never added. As before,
a crash can lose time/input since the last successfully committed checkpoint;
250 ms is not a hard upper bound under a blocked event loop or database. A
confirmed attempt, its progress update, and cursor cannot persist separately.

## Reproducible A/B/C simulations

`tests/learning.test.ts`: seed **42**, LCG 1664525/1013904223, start
2026-01-01T12:00:00Z, Europe/Paris policy, 90 days × 24 = **2160 answers** per
profile. Baseline includes all 144 directions. Sessions start exactly 24 hours
apart; wall clock advances 10 seconds per answer. Active response time is
separate: A/C 1800 ms, B 6500 ms. C always fails 6×7, 7×8, 8×9 in either
orientation and answers everything else correctly. These are algorithm
simulations, not observations of children or evidence of teaching effectiveness;
the simulated learner does not improve in response to practice.

| Metric | A: fast/correct | B: slow/correct | C: three persistent gaps |
| --- | ---: | ---: | ---: |
| Answers | 2160 | 2160 | 2160 |
| Pairs / directions covered | 78 / 144 | 78 / 144 | 78 / 144 |
| Errors | 0 | 0 | 976 |
| Mastered pairs | 78 | 0 | 75 |
| Largest established interval | 30 days | Index -1; actual next review in 1 day | 30 days |
| Presentations of the three named pairs | 86 | 66 | 976 |
| Minimum / maximum attempts per pair | 17 / 35 | 19 / 36 | 11 / 330 |

C receives an average 325.3 presentations per gap versus 15.8 per ordinary pair;
the three gaps never gain mastery. A covers both orientations and grows
intervals. B records no errors and gains no mastery. A short repeated simulation
with the same seed compares exact attempt history for reproducibility.

## Changed files

- New `src/engine/learning/{progress,scheduler,session}.ts`.
- New `src/database/{learningRepository,useLearningData}.ts`; updated `db.ts`
  and `diagnosticRepository.ts`.
- `src/features/training/{DiagnosticController,useDiagnostic,Training}` and new
  `LearningSummary.tsx`.
- `src/app/{App.tsx,router.ts}`, `components/layout/Navigation.tsx`.
- `features/dashboard/Dashboard.tsx`, `features/statistics/Statistics.tsx`.
- `locales/{es,ru}.json`, `styles/{global,responsive}.css`, `README.md`.
- New `tests/learning.test.ts`, `tests/learningPersistence.test.ts`,
  `tests/browser/learning.spec.ts`. Existing browser diagnosis/input tests moved
  to the dedicated diagnostic route, retaining useful coverage.
  `tests/foundation.test.tsx` follows the new navigation label.
- This report. package.json, lockfile, and dependencies are unchanged.

## Actually executed checks

Environment: Windows PowerShell, Node 24.22.1 / npm 11.19.1.

| Check | Result |
| --- | --- |
| `npm run build` (includes typecheck) | Passed; final HTML 0.57 kB, CSS 14.74 kB, JS 373.48 kB / gzip 116.74 kB |
| `npm run lint` | Passed |
| `npm test` | **44/44**, 4 files |
| `npm test -- --reporter=verbose` | Passed, actual PROFILE_RESULTS recorded above |
| Full `npm run test:e2e` | **90 passed, 6 skipped**, 2.6 minutes, zero retries |
| Final `npm run test:e2e -- --grep 'completes a real daily\|all five screens\|captures the foundation' --output=test-results/final` | **24/24**, 51.4 seconds, after adding the latest practice to Results |
| `git diff --check` | Passed |
| dist tree and index.html inspection | Built HTML/CSS/JS/favicon only; `/MathHero/` URLs; no source documents |

Full browser matrix: Chromium/WebKit × 390×844, 844×390, 820×1180, 1180×820.
The 24-answer session and new scenarios pass in all eight profiles. Complete
144-answer diagnosis still passes in both phone-portrait browsers; six additional
full-diagnosis repetitions are intentionally skipped, while the 24-answer part
flow runs everywhere. New checks cover draft/question/feedback/summary reload,
explicit resume, synthetic hidden state, same-tick double submit, early finish
with one/zero answers, a new independent session, targeted weak fillers,
diagnosis without progress changes, localized results, and the latest practice
on the Results screen. The final 24-test subset ran after the last UI change;
types, lint, build, and all 44 unit tests also passed after that change.

Unit/repository checks include the exact 95% threshold, recent-error window,
both directions/squares, no mastery from one day/session/diagnosis, no promotion
from elapsed time, 1/3/7/14/30 scheduling, preserved early-review due dates,
priority, no-loop quota, local days/DST, v1 migration, atomic rollback, separate
streams, equal-clock sequence, ownership/detach, duplicate submit, ActiveTimer,
and complete-session summaries independent of diagnosis.

The initial sandbox browser command did not reach tests while waiting for preview
and was stopped. A normal require_escalated run passed the full suite. The initial
offline Prettier command could not see the user's npm cache inside the sandbox;
require_escalated used the already installed Prettier 3.10.1 successfully. No
npm ci/install was run and no dependencies were added. Intermediate type/lint
checks found an owner inference issue in a test and a prefer-const warning;
both were fixed before the successful checks. Failed attempts are not counted
as passing verification.

Screenshots are in `test-results/` and `test-results/final/` (ignored by Git).
Visually inspected Chromium phone portrait (active daily question), Chromium
tablet landscape (RU summary), and final WebKit phone portrait (RU summary).
The keypad is above the bottom navigation; pause/finish
controls are reachable by vertical scrolling. Full-page PNGs show the fixed
navigation at the viewport boundary. Near-instant automated input can display
rounded 0 s: these are actual measured milliseconds, not invented child results.

## Remaining acceptance and next-stage work

1. Coordinator review and acceptance recording in DELIVERY/Git.
2. Stage 4: interactive map, all-session/directed history, charts, reward ledger,
   transactional backup/import with data/version validation. Include both session
   variants and progress; never mix baseline answers into mastery evidence.
3. Mastery-policy changes require an explicit version and progress-recalculation
   decision. session.policy and saved day keys support reproducibility, but there
   is no automatic policy migration engine yet.
4. Stage 5: PWA/offline, GitHub Actions/Pages, measured startup <=3 seconds, and
   the requested centralized translation of older documentation into English.
5. Real iPhone/iPad, native keyboard viewport behavior, nonzero safe areas,
   actual Safari backgrounding, and abrupt process termination remain **untested**.
   Browser emulation and synthetic visibilitychange do not replace device acceptance.

# Stage 2 — mathematical engine and diagnosis

Status — historical MVP stage record. See the
[current diagnosis](../pedagogy/DIAGNOSTICS.md) and [storage](../architecture/STORAGE.md) references.

Date: 15 November 2026, Europe/Paris.
Worker status at handoff: implemented with the verification below; coordinator
acceptance is recorded separately. No worker commits, push, deployment,
additional chats or agents. DELIVERY.md changes belonged to the coordinator
and were preserved.

## Delivered

- React-independent multiplication engine: 144 directed products within 1..12,
  78 canonical pairs, operand/answer validation, and an injectable RNG. Other
  operations are represented only by the extensible OperationType contract.
- Real diagnosis: Fisher-Yates shuffle once at creation, six parts of 24, each
  directed fact exactly once. Draft, order, position, feedback, inter-part break
  and completion are persisted.
- Home offers start/resume or completed results. Practice retains all three
  input paths. Errors calmly show the correct result; feedback retains the
  entered answer. Focus returns to the next input for physical-keyboard use.
- Partial/completed diagnostic results show answered/correct counts, accuracy,
  median and mean active response time for correct answers only. With no answers,
  accuracy is null/displayed as a dash; without correct answers, speed is null.
- Dexie/IndexedDB stores the session, attempts and preferences. Defaults remain
  Spanish, sound off, animations on, daily goal ten minutes.
- No stars, mastery, error repetition or adaptive scheduling at this stage.
  The map describes the absence of mastery assessment without denying saved
  diagnostic history. Outdated playground/no-storage claims were removed from
  the interface and README.

## Engine and identifiers

engine/multiplication/facts.ts provides multiplicationFact(a,b), the immutable
multiplicationFacts catalog, getFact(id), evaluateMultiplication and
MultiplicationEngine. Direction ID: mul:a:b. Canonical ID: mul:min(a,b):max(a,b).
Thus mul:7:8 and mul:8:7 are separate directions sharing mul:7:8.

Evaluation recalculates the product from operands rather than trusting an
incoming expectedAnswer. Non-integer/NaN/Infinity answers are incorrect and
unsupported operations are rejected. RNG must produce a finite value in [0,1).
Clocks and random sources are constructor inputs.

engine/sessions/diagnostic.ts implements pure createDiagnostic,
answerDiagnostic and advanceDiagnostic transitions. ActiveTimer uses injected
monotonic time without React/DOM. diagnosticStatistics selects diagnostic mode
and does not infer mastery.

## IndexedDB version 1 contract

Database name: math-hero. All records are local to the browser/origin.

| Table | Key and indexes | Data |
| --- | --- | --- |
| sessions | id, mode, startedAt | DiagnosticSession |
| attempts | id, sessionId, exerciseId, canonicalId, mode, [sessionId+ordinal] | Attempt |
| settings | id | { id: 'preferences', value: Preferences } |

There is one baseline diagnosis, ID diagnostic:baseline:v1. Calling start again
returns it without deleting history or reshuffling. No reset/repeated-diagnosis
UI was offered at this stage.

DiagnosticSession fields:

- schemaVersion 1, id, diagnostic mode.
- order: 144 saved direction IDs.
- cursor: count of committed answers, 0..144, also the next unanswered index.
- phase: question, feedback, break or completed.
- draft: zero to three ASCII digits for the current question.
- activeMs: checkpoint of accumulated active time for the current question.
- owner: random controller-instance token, not a child identifier.
- startedAt/completedAt: Unix milliseconds. completedAt is set atomically with
  answer 144, even while final feedback remains visible.
- lastAttempt: the last attempt copied for exact feedback restoration.

Attempt fields: id=sessionId+':'+ordinal, zero-based ordinal, sessionId, mode,
operation, exerciseId, canonicalId, numeric answer, expectedAnswer, correct,
rounded responseTimeMs and createdAt (Unix milliseconds). Incorrect attempts
also retain time, but do not enter speed metrics.

question -> submit -> feedback writes the attempt and advances the cursor in
one read/write transaction over attempts and sessions. UI shows successful
persistence only after commit. Feedback advances to question, break after
24/48/72/96/120, or completed after 144. Starting the next part is explicit.
Feedback and breaks do not count toward the next response.

Duplicate protection combines a synchronous busy guard before the first await,
owner/cursor/phase verification inside the transaction, and a unique attempt key.
Write failure rolls back both records. Stale checkpoint/submit writes are
rejected. Another tab can explicitly resume and acquire ownership; the old tab
then displays a save error and must reload current data. Concurrent cooperative
practice is not offered. Merely loading/reading a screen does not change owner.

## Timing, recovery and lifecycle

- performance.now() starts after the question DOM commits in a layout effect.
  UI preparation and database waiting time do not count.
- Pause, hidden visibilitychange, pagehide, beforeunload and leaving the screen
  stop timing and request a checkpoint. Returning from background requires
  explicit resume. Reloaded questions always start paused.
- No wall-clock response-start timestamp is persisted; closed-app time is never
  added to activeMs. Feedback/break phases restore without duplicate answers.
- Checkpoints run every 250 ms only during an active question. Draft changes
  and pausing force a write. Long manual pauses do not cause periodic writes.
- Abrupt process termination can lose active time and draft input after the last
  successful checkpoint. On a responsive page this is approximately 250 ms plus
  write latency, not a hard bound under event-loop blockage, slow storage or
  device failure. Async unload writes are not guaranteed. A committed attempt
  and its cursor transition cannot be saved separately.
- attach/detach, generation tokens and an in-transaction claim validity check
  prevent late load/claim completion after navigation and StrictMode remount
  from taking ownership away from the new screen.
- Read/write failure pauses practice with a localized error and reload control;
  no false successful save is shown.

## Added or changed files

- package.json, package-lock.json, README.md.
- src/engine/core/Exercise.ts; new multiplication/facts.ts;
  sessions/diagnostic.ts, ActiveTimer.ts and statistics.ts.
- New src/database/db.ts, diagnosticRepository.ts and useDiagnosticData.ts.
- src/app/providers.tsx.
- src/features/training/Training.tsx; new DiagnosticController.ts and
  useDiagnostic.ts in the same directory.
- src/features/dashboard/Dashboard.tsx and statistics/Statistics.tsx.
- src/locales/es.json and ru.json; src/styles/global.css.
- tests/setup.ts, foundation.test.tsx, new diagnostics.test.ts.
- tests/browser/foundation.spec.ts and new diagnostics.spec.ts.
- This handoff, docs/stages/02-engine-diagnostics.md.

## Actually executed checks

Environment: Windows PowerShell, Node 24.22.1 / npm 11.19.1.

| Check | Result |
| --- | --- |
| Official npm metadata for Dexie/fake-indexeddb | Dexie 4.4.7; fake-indexeddb 6.2.8 requires Node >=18 and supports installed Node 24 |
| Exact-version installation of both packages | Lockfile updated; zero audit vulnerabilities |
| typecheck, including within build | Passed |
| npm run lint | Passed |
| npm test | 22/22 passed in two files |
| npm run build | Passed; HTML 0.57 kB, CSS 14.13 kB, JS 356.52 kB / gzip 112.19 kB |
| Full npm run test:e2e | 58 passed, 6 skipped; 1.6 minutes, zero retries |
| Extra screenshots after waiting for the ready question | 8/8 passed, 11 seconds; artifacts in test-results/visual/ |
| Final input/screenshot checks after retaining the entered answer in feedback | 16/16 passed |
| git diff --check | Passed |
| dist tree and index.html | Built HTML/CSS/JS/favicon only; /MathHero/ paths, no source documents |

Browser matrix: Chromium/WebKit at 390x844, 844x390, 820x1180, 1180x820.
Both phone-portrait browsers completed all 144 answers. Six redundant complete
flows for the other sizes were intentionally skipped, not counted as passing.
Every profile passed a 24-question part, question/draft/feedback/break reload,
wrong answer, same-tick duplicate submit protection, next-part resume, results,
and persisted locale/animation settings. The hidden-page check synthesizes
visibilitychange; it is not real Safari backgrounding.

Foundation coverage still includes all input paths, RU/ES, Back, reduced motion,
no horizontal overflow and buttons at least 52 px high. Unit/repository/controller
checks cover all products/pairs, RNG, six parts, independent accuracy/speed,
odd/even median, empty statistics, pause/reload/feedback timing, concurrent
start/submit, injected write-failure rollback, stale owners/checkpoints,
database close/reopen after each of 144 attempts, late load/claim after navigation,
and StrictMode remount.

The first browser run had 47 passes, 11 failures and six skips. A new test helper
read the previous equation before the async transition finished; it was changed
to wait for an enabled textbox. The settings test now waits for IndexedDB commit
before reload. An intermediate run did not start because of a test-expression
typo, corrected before the successful complete run. Those runs are not counted
as successful. Screenshot tests similarly now wait for the equation and enabled
input; intermediate loading screenshots were not acceptance evidence.

Visually inspected refreshed WebKit phone portrait (actual question and Russian
results) and Chromium tablet landscape (Russian incorrect-answer feedback).
With no correct answers, accuracy displays 0% and speed a dash. Tall layouts may
scroll vertically; full-page screenshots place fixed navigation at the initial
viewport boundary.

Dependency/browser operations used standard require_escalated. npm ci was not
run in this stage; preview was stopped after tests. Formatting used the already
available Prettier 3.10.1 once, without adding a runtime/dev dependency.
Reference: [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()).

## Integration and remaining acceptance

1. Use actual diagnostic attempts for initial difficulty, separating errors from
   slow correct responses. Derive adaptation separately; diagnostic answers are
   not evidence of mastery.
2. Add React-independent engine/learning. New sessions need separate IDs and
   adaptive/weak modes, never the baseline ID. Extend sessions with a union and
   versioned schema changes.
3. Track directions by exerciseId and shared pairs by canonicalId. Include mode
   when computing analytics/progress. All 144 facts already exist.
4. Reuse ActiveTimer, transactional submit and input. Save scheduler/mastery in
   the same transaction as attempts.
5. Complete map/analytics, rewards, backup validation and migrations belong to
   stage 4. Version 1 has no progress/reward tables or import implementation.
6. PWA/offline, Actions/Pages and startup measurement belong to stage 5. Physical
   devices, actual native keyboard/viewport, nonzero safe areas, real Safari
   backgrounding and abrupt termination have not been verified.
7. The coordinator owns review, DELIVERY acceptance and Git checkpoints. The
   worker did not start the next stage. This report is a historical stage record.

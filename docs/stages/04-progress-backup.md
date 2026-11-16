# Stage 4 — Progress, rewards and backups

Status — historical MVP stage record. See the
[current data model](../architecture/DATA_MODEL.md) and [backup contract](../architecture/STORAGE.md).

Implemented on 15 November 2026. Stage 4 worker chat:
`01a1df84-bbcf-7481-a4c9-ee99f74ca714`.

Stage 3 was accepted before this work. This worker did not create other chats or
agents, edit AGENTS.md or DELIVERY.md, commit, push, install dependencies, or
implement PWA/Actions/Pages deployment. The coordinator separately translated
older documentation in this shared checkout. Those changes are not stage 4 work.

## Product behavior

- Home displays real ledger stars, current mastered pairs out of 78, mastered
  directions out of 144, percentage, six achievements, and today's active minutes
  against a soft 5/10/15 minute goal. Default goal remains 10 minutes.
- Completed practices show answered/correct counts, observed improvements,
  newly mastered pairs, stars earned in that practice, and newly unlocked
  achievements. These summaries do not assert that an old mastery is current.
- The parent disclosure presents training-only accuracy, correct-only mean and
  median response time, daily accuracy and speed bars, difficult directions,
  current durable mastery, and session history. Baseline diagnosis remains
  separately labeled. History includes incomplete sessions and paginated attempt
  lists (20 at a time, with Show more).
- The real 12×12 map has five colors, redundant symbols and accessible labels.
  Each directed cell has its own history; the pair disclosure combines both
  orientations. An untested reverse remains unknown. A diagnosed fast response
  can be blue but cannot be green. Gray = untested; red = an error in the last
  five directed attempts; yellow = developing/slower; blue = at least 95%
  correct in the directed window with correct median <=3 seconds; green =
  training evidence plus currently confirmed canonical mastery. When training
  exists for a direction it replaces baseline evidence for that cell's color.
- Large factor selects and the pair-training link precede the dense grid. There
  is one grid Tab stop, arrows move between cells, and Home/End move along a
  row. The selected cell, controls, history and `pairTrainingLink` stay in sync.
  The explicit link tabIndex also works with the tested WebKit keyboard behavior.
- Settings persist language, animation preference and soft daily goal. Sound
  remains off with no nonfunctional sound toggle. Four lightweight SVG fox
  expressions represent greeting, thinking, happiness and support. The fox is
  visible below the exercise on phones, preserving keypad space. System reduced
  motion and the animation setting are honored.
- Removed the implementation-preview footer and obsolete future-feature copy.
  All new UI text has RU/ES key and interpolation parity. README is now English.

## Reward contract

Diagnosis earns **no stars or achievements**. This resolves the original
specification's unspecified diagnostic reward policy: baseline answers must not
change learning mastery, practice-day achievements or training rewards. Existing
v2 training history receives the same deterministic rewards during migration.

| Event                                                         | Stars | Unique ledger ID                                 |
| ------------------------------------------------------------- | ----: | ------------------------------------------------ |
| Correct training answer, regardless of speed                  |     1 | `correct:<attemptId>`                            |
| Every fifth consecutive correct answer within one session     |     1 | `streak:<fifthAttemptId>`                        |
| Completed nonempty practice, including voluntary early finish |     2 | `completion:<sessionId>`                         |
| First confirmed mastery of a canonical pair                   |     3 | `mastery:<canonicalId>`                          |
| Successful scheduled retention review                         |     5 | `retention:<canonicalId>:<previousNextReviewAt>` |
| Achievement milestone                                         |     0 | `achievement:<achievementId>`                    |

An error resets the session streak. A new session starts a new streak. Reload
preserves it. Empty finished sessions receive nothing. A completion event is
committed with the final answer or early finish, not with rendering a summary.
The first-mastery event is retained even if mastery is lost and reacquired.

Retention requires mastery before **and** after the answer, a correct response
within the saved policy's fast threshold, time at or after the previous due date,
and a different session-local calendar day from the pair's last attempt. The
previous due timestamp identifies the review cycle. Early recalls, same-day
recalls, duplicate submits, simply reacquiring mastery and restoring the same
backup do not create a new retention event. Later eligible review cycles can
receive another +5; this is not a one-time lifetime retention reward.

The six achievements are: ten correct training answers; 25, 50 and 100 currently
mastered **directions**; seven distinct calendar days containing actual training
answers; and all 144 directions/78 pairs mastered. Seven days need not be
consecutive. Opening the app, starting/finishing an empty session or doing only
diagnosis does not count. Achievements remain as historical milestones even if
current mastery later falls. They have no additional unspecified star bonus.

The normal answer path is incremental: one journal append, deterministic reward
lookups, the current session's at-most-24 answers for streaks, at-most-78 progress
rows for thresholds, and one counter/day-index record. It does not reread and
replay lifetime attempts or sessions. `replayLearning` is reserved for migration,
backup verification and tests. Incremental and replay results are compared in
tests, including first mastery, early/due reviews, repeated restore, and two
independent retention cycles.

## IndexedDB v3 and migration

Database name remains `math-hero`. The seven tables are:

| Table       | Key / purpose                                                            |
| ----------- | ------------------------------------------------------------------------ |
| sessions    | id; diagnostic schema 1 or learning schema 2, including open draft/timer |
| attempts    | id; immutable directed answer history and source mode                    |
| progress    | canonicalId; current learning-only derived evidence and review state     |
| settings    | `preferences`; RU/ES, silent mode, animation flag and goal               |
| journal     | attempt id and unique monotonic sequence; exact global commit order      |
| rewards     | deterministic id; kind, stars, time, session and optional achievement    |
| rewardState | `totals`; correct-training count and sorted distinct practice days       |

Learning answer transactions include attempts, session, progress, journal, ledger
and rewardState. An injected ledger write failure rolls back all of them. Finish
writes its session and completion event atomically. Diagnosis adds its journal
entry atomically with the attempt and cursor, without writing learning rewards.

v1/v2 migrate automatically. Original attempts, diagnostic sessions and
preferences survive unchanged. v2 had no global commit sequence, so ties are
resolved by attempt timestamp, session start, saved session sequence, then
session ID; ordinals preserve within-session order. Sequence prevents a later
same-stream session with a lexicographically earlier UUID being replayed first.
The chosen journal then deterministically reconstructs progress, learning
summary/repeat derivatives, ledger and rewardState. This also makes the first
post-migration export self-consistent.

For exactly tied interleaved **different streams**, v2 cannot prove the original
cross-stream order. Derived values may be normalized to the deterministic order;
source attempts, answers, times and unfinished-session fields are retained.
This ambiguity is explicit rather than silently producing an unimportable backup.
The migration test uses equal times, reverse lexical session IDs, a correct
answer followed by an error on one pair, and validates the resulting export.

## Backup contract

Envelope: `format: "math-hero-backup"`, `version: 1`, `databaseVersion: 3`,
`exportedAt`, and `tables` containing **all seven tables**. All active streams,
open drafts, active response milliseconds, feedback, pending repeats, histories,
preferences and rewards are included. No source attachment is part of `dist/`.

The read transaction provides a consistent snapshot. Export validates its own
snapshot. Import parses and validates before showing a modal with answer/session
counts and an explicit replacement warning. Cancel and Escape leave storage
unchanged. The actual restore validates again before beginning one read-write
transaction across every table. Clear and bulk insert occur in that transaction;
any failure restores the original data. There is no partial merge.

Validation checks exact envelope/table/record keys, supported versions and modes,
finite numbers and integer/range constraints, valid known fact IDs, answer
correctness, canonical links, unique IDs and journal sequences, session references,
ordered ordinals, cursor/order/phase relationships, lastAttempt, completion state,
preferences, supported policy parameters and valid IANA time zones. Dangerous
prototype property names are rejected. Learning evidence, per-session summaries,
repeat queues, every reward and the counter/day index are reconstructed from
source attempts in journal order and compared exactly. Imported totals are not
trusted. Future policy or backup versions require an explicit migration; they
are currently rejected safely. v2 refers to automatic database migration, not
to a nonexistent earlier JSON backup format.

Restore clears session owners. A stale view's old owner cannot submit/checkpoint
into the restored history; explicit resume claims a fresh owner. Live settings
observe restored preferences without writing stale in-memory values back over
an import. Repeating an import replaces the same ledger instead of accumulating
its values. Replaying a previously saved pending answer creates its one
original deterministic reward event in the restored history.

The file picker currently accepts backups up to 20 MB. Full validation/replay
runs synchronously and may pause the UI for large histories; it does not run on
every answer. The 2160-answer history is covered below. Backups check internal
consistency, not authenticity: a fully fabricated but self-consistent history
cannot be distinguished from genuine practice without an external trust source.
The application is intentionally local and does not introduce one.

## Executed verification

Environment: Windows PowerShell, Node 24.22.1, npm 11.19.1. No dependencies added
or installed. Existing lockfile and dependency versions are unchanged.

| Check                                    | Result                                                            |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `npm run build` including typecheck      | Passed; HTML 0.57 kB, CSS 16.74 kB, JS 402.88 kB / gzip 125.09 kB |
| `npm run lint`                           | Passed                                                            |
| `npm test -- --reporter=verbose`         | 54/54 tests, five files                                           |
| Focused new Chromium phone scenarios     | 3/3 passed                                                        |
| Focused corrected WebKit phone scenarios | 3/3 passed                                                        |
| Final full browser matrix                | 114 passed, six intentional skips, zero retries, 3.3 minutes      |
| `git diff --check -- src tests`          | Passed                                                            |
| UTF-8/mojibake scan of src               | Passed after repairing two decorative stars                       |

The 90×24 repository scenario loads 2160 real engine-generated answers, restores
them, submits the next answer through the incremental repository, asserts no
lifetime `attempts.toArray` or `sessions.toArray` reads, and verifies complete
export/replay parity. The measured incremental submit was **3 ms** in the final
unit run using fake IndexedDB. This is a regression check, not a real Safari
performance claim. The original seeded A/B/C learning simulations still pass.

Final matrix: Chromium and WebKit at 390×844, 844×390, 820×1180 and 1180×820.
The full 144-answer diagnosis runs on both phone-portrait browsers; six additional
full-diagnosis repetitions are intentionally skipped, while 24-answer part flows
run on every profile. Final screenshots are under `test-results/final/`.

The added tests cover reward deduplication, streaks, empty completion, diagnostic
exclusion, all six milestones, seven actual practice days, correct-only speed,
all five cell statuses, unknown reverse direction, valid/corrupt/foreign-version
backups, IDs and references, forged progress/rewards/counters/summaries, bad
policies, cancellation, replacement rollback, ledger rollback, draft/timer resume,
stale-owner rejection, repeat restoration, and v1/v2 migration.

Browser additions exercise actual JSON download and file upload, corrupt import,
keyboard Escape cancellation with exact database comparison, repeated restore,
RU preferences and daily goal, resumed draft, child stars, parent daily history,
144 interactive cells, large selectors, keyboard Tab/arrow navigation, targeted
practice, both locales, animation settings and all four fox states.

Intermediate failures were corrected and are not counted as passing evidence:
JSDOM's missing dialog.close on a closed dialog; two fixture mistakes; the first
browser helper reading an old equation before the next question was enabled;
an incorrect Russian label in a test; WebKit link focus without explicit
`tabIndex=0`; and a reload test not waiting for the settings transaction. One
sandbox browser run never started the preview server and was stopped. Normal
`require_escalated` browser execution worked. An intermediate full matrix had
107 passing, seven failing, six intentionally skipped tests before the WebKit
corrections. No automatic approval rejection occurred.

Visually inspected the Chromium phone map and tablet landscape RU analytics,
plus the final WebKit phone map and training screen with the visible thinking fox.
The dense map fits without horizontal scrolling, the large controls and selected
cell are clear, and the history/analytics wrap cleanly. Full-page screenshots
show fixed navigation at the viewport boundary; vertical scrolling reveals
content below it. Fast automated answers can display rounded 0 or 0.1 seconds;
these are measured active times, not invented child performance.

## Changed files

- `src/engine/learning/{analytics,rewards}.ts`.
- `src/database/{backup,rewards,useProgressData}.ts`; v3 `db.ts`; diagnostic and
  learning repositories.
- `src/app/{App,AppContext,providers}`; `components/mascot/Mascot.tsx`.
- Home, Settings, interactive MultiplicationMap, Statistics, LearningSummary and
  Training; new `BackupControls`, `Achievements`, `History`, `ParentAnalytics`.
- `src/locales/{es,ru}.json`, global and responsive CSS.
- `tests/progressBackup.test.ts`, `tests/browser/progressBackup.spec.ts`, existing
  foundation browser expectations and v1 migration version expectation.
- English README and this handoff. No changes to dependencies or the lockfile.

## Outstanding acceptance and limitations

1. Coordinator review, acceptance evidence in DELIVERY.md, and Git operations.
2. Physical iPhone/iPad acceptance remains unexecuted: Safari file picker/download,
   actual backgrounding, native keyboard, VoiceOver, safe areas, real performance
   and abrupt process termination must be checked on devices. Emulation does not
   establish those results.
3. Stage 5 must implement offline PWA caching, Actions/Pages deployment and startup
   measurements. No offline or published-site claim is made by this stage.
4. Large history views currently read local history into memory. Backup replay and
   migration are synchronous; no streaming backup or history virtualization exists.
5. Ordinary settings writes are asynchronous. Tests wait for committed storage
   before deliberately reloading. A device/browser termination before a pending
   write commits can lose that preference change; saved answer transactions and
   confirmed backup replacements remain atomic.

# Column arithmetic engine and storage contract

Stage 1 implements the pure engine and replay in `src/engine/column/`. The
[approved requirements](../product/REQUIREMENTS-COLUMN-ARITHMETIC.md) cover the
full module. Stage 2 adds the repository and backup integration. Child and
parent screens belong to subsequent stages.

## Arithmetic and entry

`arithmetic.ts` defines `ColumnExercise`, an operation and two integer operands
from 100 through 999. Subtraction requires `top >= bottom`. Addition ranges
from 200 through 1998 and subtraction ranges from 0 through 899. `exerciseId`
identifies the displayed order. `operandPairId` treats reversed addends as the
same practice pair and includes the operation. Lookup and replay use numeric
operands, so a saved order contains everything needed to show the same exercise.

`columnWork` computes the result and each place's incoming and outgoing carry,
or the digit lent to a lower place and the borrow from a higher place. The
subtraction steps include the adjusted top digit, including the 9 in a borrow
through an original zero. The addition steps include the thousands digit
separately. Use these steps as data for a deliberately requested explanation.

`draft.ts` uses four cells indexed from units (`0`) to thousands (`3`). In
subtraction the fourth digit is always `null`, the fourth mark is always false
and active place is at most `2`. Addition permits marks above tens, hundreds
and thousands. Subtraction permits dots above the three digits of the top
operand. Marks are free-form working notes. The default draft starts at units
with empty digits, no marks and `hintShown: false`.

- Entering a digit replaces the active cell and moves focus one place left,
  stopping at the highest available cell. Select allows arbitrary replacement.
  Erase clears the active cell. If the active cell is blank and the cell on its
  right has a digit, erase clears that digit and moves focus there.
- The checker evaluates the whole numeric value. The units cell must contain
  a digit, including explicit `0` for a zero answer. Omitted leading cells and
  explicitly entered leading zeros are valid. Every cell between the units and
  the highest entered cell must be filled. Check is available once there's at
  least one digit, including incomplete answers. An empty draft has no check.
- A check records `answer: null` when the entry is gapped, and reports the
  first unmatched or missing place from units to highest relevant place. That
  place tells the child where to revisit the entry. Entry order and mismatches
  give no evidence about the child's mental calculation order or the cause of
  an error.

## Session and journal

`session.ts` defines `ColumnSession` schema 1, policy 1, `ColumnAction`,
`ColumnJournalEntry`, `ColumnAttempt`, and the repository-only `ColumnRevision`.
A session has a unique ID, seed, recorded time zone, start sequence, generated
order, summary and terminal state. Its current exercise is `order.at(-1)`
while `draft` is present. Ordinals are zero-based. A completed snapshot has
`end`, `draft: null`, `checks: 0` and `activeMs: 0`. The full generated order
and attempts remain available for history.

| Action | Transition |
| --- | --- |
| `start` | Creates the first independent draft with the selected operation, a 32-bit seed and the device's IANA time zone. |
| `check` | Captures input and cumulative active time, creates an immutable attempt and freezes the draft in `incorrect` or `correct` feedback. |
| `hint` | Captures input and time, sets sticky `hintShown: true`, and leaves the answer/feedback phase in place. The first request adds one helped example. |
| `retry` | Explicitly leaves incorrect feedback for editing. It preserves digits, marks, hint exposure and elapsed time and focuses the first mismatched place. |
| `advance` | Consumes correct feedback and issues the next exercise, or completes the session after the sixth. |
| `skip` | Consumes the open unsolved exercise. It increments the skipped count and issues the next exercise or completes the session. Skipping creates no check. |
| `finish` | Ends the session deliberately, preserving recorded checks and solves. An unfinished exercise is abandoned without an extra check or skip. Finishing from correct feedback on the sixth exercise is normal completion. |

Check numbers start at 1 for each exercise. An attempt ID is
`${sessionId}:${ordinal}:${checkNumber}`. Only the first check contributes to
first-check accuracy, including helped first checks. A correct first check with
`hintShown: false` is independent, regardless of the manual notes. A successful
retry counts as a solve and preserves the original first-check result. All
checks retain submitted cells, marks, elapsed time, help at check, correctness,
mismatch, sequence and raw/effective wall times. A later hint is still visible
in the journal when the child opened it after an incorrect first check.

`checkpointColumnDraft` accepts the three editable `ColumnInput` fields
(`columnInput(draft)` extracts them) and nondecreasing cumulative active
milliseconds. It preserves the phase and help flag. Only `answering` permits
ordinary checkpoints. A command that captures input during feedback must
match the frozen input and time exactly. `hintShown` stays true until the
exercise is consumed. Whether an explanation panel is currently expanded is
view state. A controller should commit `hint` before displaying the solution.

## Pilot policy and evidence

`policy.ts` provides fixed version 1 parameters. A full six-example session
visits every skill for the selected operation. Addition groups examples into
no carry, one carry, multiple carries below thousands and carry into thousands.
Subtraction groups them into no borrow, one borrow, multiple borrows, borrow
through zero and zero result. These are disjoint groups. A group appears at
most twice and never consecutively. Equality appears at most once. The first
encounter with selected groups guarantees a chained carry, a non-leading zero
in a sum and a short positive answer from a borrow through zero.

Six examples give both operations complete coverage and leave at least one
slot for a targeted revisit. A 24-hour initial gap requires a full day of
elapsed time even if practice straddles midnight. Extending to 72 hours after
retained evidence asks for recall after a longer gap while keeping follow-up
within several days. Two supporting days give a delayed review two prior
independent observations to build on. Two misses in four recent checks allow
one isolated miss and keep the difficulty signal responsive to improvement.
These are initial product defaults for the pilot. Describe the result as
observed performance within the app's review window. Educational validation
and evidence of long-term mastery would require separate observations.

Selection reserves enough remaining slots for uncovered groups and prioritizes
due reviews, recurring difficulty and new groups in that order. Otherwise it
prefers groups least recently practiced. A reproducible seed and ordinal break
ties and drive operand choice. `generator.ts` tries at most 96 random draws,
then searches the finite canonical pair space at most once, with a direct
900-case fallback for equality. It prefers a fresh pair, relaxing an initial
feature target if needed. Only an exhausted group falls back to a repeated
pair, which receives no fresh-evidence credit. Any issued pair, including a
skipped or abandoned one, enters the seen index.
The v1 parameters, seed stream, skill order, fallback order and evidence rules
are part of the replay contract. A later policy requires an explicit version
with continued support for replaying v1 events.

- Two independent first-check solutions on fresh pairs in distinct sessions
  and distinct recorded local days provide support. The engine keeps the latest
  two qualifying supports. Local-day comparisons use the same `calendarDay`
  formatter as multiplication, and compare historical times in the current
  session's zone as well as checking their recorded dates. This keeps a zone
  change alone from turning one local day into multiple evidence days.
- A further independent first check on a fresh pair with an eligible review
  establishes current retained evidence. The review must have started after
  at least 24 elapsed hours since the skill's last recorded practice, in a
  different session and local day. Subsequent reviews are due after 72 elapsed
  hours while retained evidence is current. Practice on the skill resets its
  gap. Presenting the example, making any check, retrying, requesting a hint,
  skipping, or deliberately ending with the exercise unsolved records exposure.
  Moving on after correct feedback keeps the time of the solved example's last
  check. An issued review that began too early cannot become eligible just by
  waiting on that exercise. An open exercise blocks a second session of that
  operation. Applying a check also verifies that the skill's latest exposure
  still belongs to the current session and ordinal.
- A wrong first check, including a helped one, clears current retained evidence
  and its supporting streak. The earlier check and review remain in the immutable
  history and their proof can be reconstructed by replaying that journal prefix.
  Helped correct answers and retries give no supporting credit. Recurring
  difficulty means two misses in the latest four first checks on fresh examples
  in a group. The evidence records whether help was present and the first
  mismatched place. Parent wording should describe observed errors.
- Keep time descriptive. Compare active time for independent correct first
  checks within the same operation and comparable regrouping pattern. The
  attempt ordinal resolves to an exercise and its computed pattern, and the
  notes remain inspectable. Time does not determine independent credit,
  difficulty, retained evidence or rewards. No multiplication rewards accrue.

Journal sequence orders every event across both operations. Wall timestamps
remain in history, and the reducer tracks the highest committed wall time so
a backward timestamp does not move the exposure clock backward. Selection
and evidence exclude time-based credit while a raw timestamp is behind that
watermark. Full elapsed gaps use device wall time across launches, subject to
device clock accuracy. Active response times should use the existing monotonic
`ActiveTimer` and store only accumulated milliseconds.

## Persistence and controller integration

Dexie v5 adds column session, attempt, journal, progress, seen and local state
stores. Column progress is keyed by operation and skill.
There is one open session per operation, including any feedback or paused
draft. Resume uses its stored order and draft, so claiming a session never
generates different operands.

1. A repository transaction reads the latest owned snapshot, operation's
   progress and global column journal cursor. For an event, it allocates the
   next contiguous positive sequence and uses an injected wall clock for
   `at`. The injected random source supplies the session seed when starting.
   The device's time zone is recorded then and used for the session's lifetime.
2. `applyColumnEvent` takes the prior session, cursor, operation's skill rows,
   and seen-pair membership. It returns the new snapshot and cursor, any
   immutable attempt and issued selection, and skill rows to upsert. Commit
   these together with the event. Update the seen-pair index on issuance before
   any later selection. Keep `sequence` and the effective time watermark
   available without scanning the journal for each answer. The seen index uses
   one triangular pair bitmap per operation. Only commands that can issue an
   exercise read it. Checkpoints only read the session and generation state.
3. Every editable checkpoint, phase change and ownership change compares a
   session identity and exact `{generation, owner, revision}`. Increment the
   revision for every accepted write. Adopting an open session changes the
   owner and invalidates the previous view's revision. Long-running writes
   should use cancellable transactions. Rotate the generation on column restore
   and release owners, including for a restore of the same backup. Ownership
   metadata stays local and outside the portable canonical snapshot.
4. The controller serializes or coalesces draft writes to retain the latest
   revision. Pause, mode or operation switch, and save-and-exit stop timing and
   commit the whole current input plus elapsed time before leaving. The UI
   cancels automatic advance as soon as practice is covered, paused, hidden,
   detached or stale. Correct feedback schedules an advance only against the
   exact currently owned revision while the view is active. A feedback timer
   never claims ownership. Incorrect feedback requires deliberate retry or
   another explicit action. No feedback, hint-panel, pause or hidden time
   accrues. Crash recovery restores the latest committed snapshot.

`replayColumnJournal` sorts events by sequence, requires a contiguous history
and one open session per operation, and rebuilds generated orders, attempts,
cursor, seen-pair membership and operation/skill progress. It rejects unknown
event shapes and policy versions. `validateColumnSessionSnapshot` requires
exact replay agreement except for a legal editing tail in an `answering`
snapshot. That tail may change only digits, marks, active place and cumulative
active time. It cannot move time behind the last journaled state. Completed
sessions and both feedback phases must match exactly. The decoder matches all
stored attempts and progress rows against replay with exact keysets, rejecting
missing, duplicate, dangling or altered rows. Replay checks internal
consistency, with the same trust limits as other user-editable local backups.

## Backup and compatibility

The v3 portable JSON envelope includes column snapshots, attempts, journal
and progress alongside multiplication and common preferences. Full import
validates both modules, then replaces both scopes in a single transaction and
rotates the column generation. The column cursor and seen pairs are rebuilt
from replay. V1/v2 imports preserve column history and drafts while replacing
multiplication and common preferences. The restore confirmation states the
scope for the selected file. The PIN verifier stays on the destination device
for all three formats. The [storage reference](STORAGE.md) describes the additive
native migration.

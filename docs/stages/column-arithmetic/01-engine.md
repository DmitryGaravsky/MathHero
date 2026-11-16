# Column arithmetic stage 1 handoff

Implemented and verified locally on `column/01-engine`, ready for coordinator
review. The [architecture contract](../../architecture/COLUMN-ARITHMETIC.md)
defines the data shapes, pilot policy and pending integration behavior.

## Changed files

| File | Responsibility |
| --- | --- |
| `src/engine/column/arithmetic.ts` | Valid operands, directed and canonical pair identities, per-place computation and disjoint skill groups. |
| `src/engine/column/draft.ts` | Four-place input representation, manual notes, check semantics and place-edit transitions. |
| `src/engine/column/generator.ts` | Version 1 seed stream, bounded operand selection and exhaustive fresh fallback. |
| `src/engine/column/policy.ts` | Six-example selection, due reviews, help/accuracy/solve totals, recurring misses and current retained evidence. |
| `src/engine/column/session.ts` | Pure checkpoint and journal reducer, phase transitions, immutable checks and ownership token contract. |
| `src/engine/column/replay.ts` | Full sequence replay and validation of the one editable snapshot tail. |
| `tests/columnArithmetic.test.ts`, `tests/columnSession.test.ts` | Arithmetic, draft, scheduling, session, evidence and replay verification. |
| `docs/architecture/COLUMN-ARITHMETIC.md`, `docs/stages/column-arithmetic/01-engine.md` | Architecture contracts and stage evidence. |

## Pilot and invariants

- Six exercises let a full session cover all four addition or five subtraction
  skill groups and leave room for a focused revisit. A group occurs at most
  twice and never consecutively. A new exercise starts independent at units
  with empty digits and marks.
- Addition accepts 200–1998 and subtraction 0–899, with operands 100–999.
  Short results allow omitted leading cells. The units entry is mandatory and
  interior blanks require explicit digits. A distant wrong or missing place
  can be identified without inferring why the child made the error.
- Reviews use a 24-hour interval since any recorded practice of the same skill,
  extending to 72 hours while retained evidence is current. Two supporting
  solves on different local days and sessions plus a later qualifying review
  use three distinct fresh pairs. The session's recorded zone drives calendar
  comparisons. Near-due practice resets the gap. Backward timestamps cannot
  generate new time-based evidence while behind the journal watermark.
- One exercise contributes at most one first check, including when the child
  later corrects the answer. Manual marks never disqualify independence. Help
  is sticky and separately counted. A wrong first check after help remains an
  error observation and clears current retained evidence. Historical attempts
  and the journal prefix still show the past result. Recurring difficulty uses
  two misses within four fresh-example first checks. Active time is descriptive.

## Executed checks

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | 82 passed in 9 files, including 14 new column tests. |
| `npm run build` | Passed. The checker verified the distribution and the worker revision `01ee92a8204ef083b478` with nine precached assets at `/MathHero/`. |

The arithmetic property test checks 810,000 addition and 405,450 valid
subtraction pairs, verifying intermediate carries and borrows independently of
the final sums and differences. Deterministic cases cover `586 + 647`,
`604 − 187`, `199 + 205`, `501 − 492` and `304 − 304`, including the `233`
and `17` marked draft states, interior gaps, explicit zeros, and extra digits.
Session tests verify both operation mixes, feature coverage, fallback sampling,
sticky help, earned and regressed evidence, a review blocked by more recent
practice, final feedback replay, and interleaved equal/backward timestamps.

## Stage 2 and 3 integration

- Use `applyColumnEvent` in the owning repository transaction. Persist its
  session, nullable attempt and changed progress plus the journal entry and
  cursor. Include newly issued pairs in the freshness lookup used by the next
  selection. The stored order is authoritative when rendering or resuming.
- Keep `ColumnRevision` with the local repository record. Claiming,
  checkpointing, phase mutations and restore must invalidate stale revision
  tokens. Enforce one open session per operation transactionally. Use
  `replayColumnJournal` and `validateColumnSessionSnapshot` to validate full
  backups and compare the stored attempts and progress exactly to replay.
  The additive upgrade, portable envelope, legacy scope confirmation and
  native 1.1 fixtures are Stage 2 acceptance work.
- Stage 3 should call `editColumnDraft` for the child controls and
  `checkpointColumnDraft` through the repository. Commit help before showing
  `columnWork` explanation data. Use `ActiveTimer` with cumulative active time
  through pause/resume. Restore the saved active place and phase. Schedule
  automatic correct feedback advancement only while active and against the
  committed owned revision. Serialize checkpoint writes and await the newest
  accepted snapshot on explicit interruption.

The finite fallback may scan up to 405,450 canonical pairs when a skill is
heavily exhausted. Real elapsed gaps across launches depend on the local device
clock. The policy thresholds are initial product defaults for the pilot, and
the parent interpretation is limited to observed performance within the app's
review window. Release acceptance still needs
repository/backup, native upgrade and browser regression, offline/PWA, localized
UI and physical iPhone/iPad checks. Browser, PWA and native upgrade suites were
left for stage PR CI. This stage's checks were local and automated.

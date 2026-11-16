# Column arithmetic stage 2 handoff

The persistence and compatibility implementation is on the prepared
`codex/column-02-persistence` branch. The published multiplication records
and policy rules are preserved. The [data model](../../architecture/DATA_MODEL.md)
lists the six additive column stores.

## Changed files

| Files | Changes |
| --- | --- |
| `src/database/db.ts`, `columnRepository.ts`, `columnSeen.ts` | Additive v5 schema, transactionally unique open sessions, compare-and-set ownership, checkpoints, phase changes, progress, journal, global cursor and operation-specific pair bitmaps. |
| `src/database/backup.ts` | Portable v3 export, exact column journal replay and transactional scope-aware restore. V3 normalizes the legacy multiplication owner field to null and exports canonical column snapshots without their local wrappers. |
| `src/engine/column/draft.ts`, `replay.ts`, `session.ts` | Enforce exact input tuple and record shapes, including arrays passed directly to the repository. Share the replay equality check with the backup decoder. The accepted arithmetic and policy rules are unchanged. |
| `src/features/settings/BackupControls.tsx`, `src/locales/es.json`, `src/locales/ru.json` | Localized scope confirmation and module counts. Legacy confirmation explicitly preserves column history, unfinished sessions and the PIN. |
| `tests/columnPersistence.test.ts`, `tests/learningPersistence.test.ts`, `tests/settingsArchitecture.test.tsx`, `tests/browser/progressBackup.spec.ts` | Repository concurrency, cancellation, exact backup contents, rollback, legacy scope and localized backup browser coverage. Existing migration and settings checks target the new candidate version with genuine legacy envelopes. |
| `scripts/test-upgrade.mjs`, `playwright.upgrade.config.ts`, `tests/pwa/server.mjs`, `tests/support/nativeSnapshot.ts`, `tests/upgrade/` | Build both authentic published commits, verify worker revisions and compare candidate stores to native browser snapshots. |
| `docs/architecture/COLUMN-ARITHMETIC.md`, `DATA_MODEL.md`, `STORAGE.md`, `docs/user/DATA_AND_BACKUP.md`, `docs/development/TESTING.md` | Document storage, backup scope and how to reproduce verification. |

## Stage 3 controller API

Use one owner ID per mounted practice instance. The open observation is
read-only. Take ownership in response to explicit entry or resume.

```ts
const repository = new ColumnRepository();
const observed = await repository.readOpen(operation);
let current = await repository.claim(operation, observed, viewOwner, signal);

const edited = editColumnDraft(operation, current.session.draft!, { type: "digit", digit: 3 });
current = await repository.checkpoint(current.token, columnInput(edited), accumulatedMs, signal);
current = await repository.act(current.token, {
  type: "check",
  input: columnInput(current.session.draft!),
  activeMs: stoppedTimerMs,
}, signal);
```

- The current exercise is `current.session.order.at(-1)` while a draft is
  present. The full draft and cumulative active time come from the committed
  snapshot. Start timing only for a visible, active answering view.
- Serialize or coalesce edits and commands. Use each returned token for the
  next write. Show an explanation after committing `act(token, { type: "hint",
  input, activeMs })`. In feedback, pass the exact stored input and elapsed
  time to any command that captures them. `retry` and `advance` take just
  their type.
- When pausing or exiting, await `release(token, { input, activeMs }, signal)`
  during answering, or `release(token, undefined, signal)` during feedback.
  The answering release commits the last edit and relinquishes ownership in
  the same transaction. Either release preserves the phase.
- Schedule correct feedback advancement only for the active view. Capture
  the token returned by the check and call `act(token, { type: "advance" },
  signal)` with it. Cancel the timer and its transaction as soon as practice
  is hidden, covered or detached. Restore or reopening requires an explicit
  claim. Surface `StaleColumnSessionError` through the controller's reload
  path. Any retry of a stale claim should stay tied to explicit entry.

## Native fixture provenance

The upgrade runner builds MVP commit
`923d1f634047322e688eafb38679ad3dba66e1d7` and 1.1 commit
`9309abde58cff9c001e7944f29d2b727965ee093` and checks their published workers
`7a73513eb82bcfc66d1d` and `01ee92a8204ef083b478` respectively. The MVP
continues to use its isolated pinned lockfile. No dependency changes were
needed.

The 1.1 suite creates empty and populated v4 IndexedDB databases in fresh
Chromium and WebKit contexts. All fixture input comes through the published
app UI. Dates, random seed and scripted answers are synthetic. The populated
fixture completes six targeted practice sessions on six dates, saves wrong
feedback in another targeted stream and pauses adaptive practice with a
`42` draft. It sets preferences and changes the local PIN in the published
settings UI. Native capture includes all eight store key paths, indexes and
rows, including the custom salt and verifier bytes. Both engines recorded
eight sessions, seven attempts, seven journal entries, two progress rows and
14 rewards. The tests then switch the
same origin to the candidate, compare every old store, and require six empty
column stores. They import the actual published v2 file in the candidate UI,
verify its legacy confirmation, and compare the re-exported multiplication
tables and local PIN bytes. The custom PIN still opens parent mode, and the
saved draft and feedback resume there. The published v2 export and native
captures are attached to Playwright results under `test-results/upgrade/`.

## Executed checks

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test` | 90 passed in 10 files, including eight new column persistence tests. |
| `npm run build` | Passed. Distribution verified at `/MathHero/` with nine precached assets and candidate worker `3804e3976efa62b68cc3`. |
| `npm run test:e2e -- tests/browser/progressBackup.spec.ts tests/browser/pairEvidence.spec.ts --reporter=list` | 40 passed across Chromium and WebKit, phone and tablet in both orientations. |
| `npm run test:pwa` | 10 passed across Chromium and WebKit. |
| `npm run test:upgrade` | 10 passed across Chromium and WebKit. The six existing MVP checks and four new 1.1 checks run in the same command. The existing CI invocation covers both baselines. |

The new repository tests cover two connections racing for the same operation,
distinct open sessions for both operations, revision and generation guards,
duplicate checking and advancement, exact feedback/draft resume, bounded
reads, rollback after partial writes, v1/v2 preservation and corruption of
v3 snapshots, attempts, progress, journal and support proofs.

## Outstanding acceptance

The child controller, illustrations, touch and keyboard entry, timing and
feedback while visible, offline draft resume, and parent reporting are
subsequent stages. Device acceptance on iPhone and iPad remains open.
An abrupt process exit can interrupt an in-flight checkpoint. The last
committed checkpoint is recoverable. Portable backup validation runs in
memory within the existing 20 MB file-picker limit and checks internal
consistency of the recorded history.

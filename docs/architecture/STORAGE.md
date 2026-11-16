# Persistence, resume and backup

Status — implementation reference for the column arithmetic integration.

## Multiplication answer lifecycle

The practice controller starts timing when the question is available and stops
it on submission, pause, navigation, visibility changes or when the parent
dialog covers the screen. The saved active-time checkpoint belongs to that
question. Feedback and hidden intervals do not enter response time.

Repositories claim sessions and check ownership in the write transaction.
A deliberate resume can take ownership from a different view. A stale view
cannot update the session after that handoff. Correct feedback can trigger
advance after 800 ms only for the original active owner and exact saved
feedback snapshot. Paused, covered, hidden or restored feedback waits for a
deliberate continuation. Wrong feedback always waits.

The accepted answer, session phase, journal entry, learning progress and
rewards are saved together. Reward writes use bounded data and deterministic
event IDs. The journal records the cross-stream order for exact replay. Drafts
and active time use asynchronous checkpoints, so a process exit during a
checkpoint can lose the most recent edit.

## Column arithmetic answer lifecycle

There is one open session per operation. A unique sparse index enforces this
inside IndexedDB. A view reads the open snapshot, then takes ownership through
an explicit claim that compares session ID, generation, owner and revision.
Claims, edits, phase changes and releases increment the revision. Use the
returned token for the next serialized write. Release can commit the final
answering checkpoint alongside the owner change. After release, the next view
claims the saved snapshot and sees the same exercise, marks, hint state and
phase.

Checkpoints store the entire current input and cumulative active milliseconds.
Events commit the updated session, journal entry, any attempt or changed skill
progress, any newly issued pair and the new cursor in one cancellable transaction.
A check reads just the owned session, the singleton cursor and the operation's
skill rows. Issuing an exercise also reads one operation-specific pair bitmap
of 50,682 bytes. The global column cursor orders events across both operations
and tracks the highest committed wall time.

## Migration and backup

Schema v5 adds six empty column stores. The eight published v4 stores, including
the local PIN verifier, keep their native indexes and rows. The upgrade from
published v3 also adds the parent verifier store. Earlier schema upgrades create
the multiplication journal and rebuild derived data for pre-journal databases.

The exporter writes the v3 JSON envelope for database v5. The importer also
accepts v1/database v3 and v2/database v4. V1 accepts multiplication policy v1.
V2 and v3 accept both registered multiplication policies. Validation checks
record shapes, relationships, exact policy fields and replayed evidence before
offering confirmation. Column replay reconstructs the journal's outcomes and
compares sessions, attempts, progress and support proofs. Only an answering
snapshot can include a later legal editing checkpoint. The file picker accepts
files up to 20 MB and validation loads the file in memory. The checks establish
internal consistency of the local backup.

Full v3 restore replaces both practice modules and common preferences in one
transaction. It clears owners, rebuilds the column pair index and cursor, and
rotates the column generation every time. V1 and v2 restore replace multiplication
and common preferences while preserving all column data and its owners. Cancel,
failed validation and transaction aborts preserve the previous data. The
destination's local PIN verifier stays in place for all formats.

## Parent gate

A custom four-digit PIN is stored as a versioned salted PBKDF2-SHA-256 verifier
with 100,000 iterations, using Web Crypto. An absent verifier uses the default
`1234`. Deliberate reset deletes that local row and returns to the default.
The gate confirms a mode switch. Learning history uses ordinary browser
storage and has no account authentication or PIN encryption.

See the [data model](DATA_MODEL.md) and [user backup instructions](../user/DATA_AND_BACKUP.md).

# Persistence, resume and backup

Status — active implementation reference for MathHero 1.1.

## Answer lifecycle

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

## Migration and backup

Schema v4 adds only the parent verifier store to the published v3 schema.
Existing sessions, attempts, progress, preferences, journal and rewards retain
their records. Earlier schema upgrades create the journal and rebuild derived
learning data for pre-journal databases in a transaction. Established journals
use their sequence even when wall-clock time disagrees.

The exporter writes the v2 JSON envelope for database v4. It excludes the local
verifier. The importer also accepts the previous v1 envelope for database v3.
V1 accepts registered policy v1. V2 accepts both registered policies. Validation
checks schema, IDs, relationships, exact policy fields with the saved IANA zone,
ordering and replayed summaries, learning evidence and rewards before offering
confirmation. The file picker accepts files up to 20 MB. Validation loads the
backup in memory. These checks establish internal consistency. A backup has
no digital signature or external authenticity proof.

Confirmed restore replaces the seven portable stores in one transaction and
clears session owners, so a previous view cannot overwrite restored state.
Cancel or failed validation leaves the database as it was. A failed write
rolls back. The destination's local PIN verifier stays in place.

## Parent gate

A custom four-digit PIN is stored as a versioned salted PBKDF2-SHA-256 verifier
with 100,000 iterations, using Web Crypto. An absent verifier uses the default
`1234`. Deliberate reset deletes that local row and returns to the default.
The gate confirms a mode switch. Learning history uses ordinary browser
storage and has no account authentication or PIN encryption.

See the [data model](DATA_MODEL.md) and [user backup instructions](../user/DATA_AND_BACKUP.md).

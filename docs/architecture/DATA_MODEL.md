# Data model

Schema reference for MathHero 1.2.

IndexedDB schema v5 keeps the eight published v4 stores and adds six for
column practice. The first seven v4 stores are portable across the three backup
formats. One multiplication attempt references a session and records both the
directed fact ID and the canonical pair ID.

| Store | Key and contents |
| --- | --- |
| `sessions` | Session ID. Diagnosis uses schema 1, with saved shuffled order and part progress. Practice uses schema 2, with saved policy, stream sequence, optional target, selected order, repeat queue and summary. Both keep cursor, phase, owner, draft, active time and last feedback. |
| `attempts` | Session ID plus answer ordinal. Records operation, answer, expected product, correctness, active milliseconds and timestamp. |
| `journal` | Attempt ID, with unique cross-session commit sequence used for replay. |
| `progress` | Canonical ID. Keeps recent practice evidence, per-direction aggregates, current interval, due time and mastery. |
| `settings` | `preferences`, the language, theme, animation, sound and daily goal snapshot. Older rows may omit theme and resolve to System. |
| `rewards` | Unique event ID. Tracks practice stars and historical achievement milestones. |
| `rewardState` | `totals`, the incremental correct-answer count and distinct practice days. |
| `parentGate` | `parent`, the optional versioned local salt and hash. |

For example, `mul:8:7` is a directed fact whose canonical ID is `mul:7:8`.
Evidence combines those orientations. Per-direction counts and attempts keep
them distinct. Practice retains the policy and IANA time zone in effect when
that session started. Wall-clock time determines due dates and local-day
evidence. The journal sequence determines processing order, even when two
timestamps tie or the clock moves backward.

A progress row can omit `retentionCheck` (including legacy rows), contain a
verified check or carry an explicit null after invalidation. The check stores
the date, previous due timestamp, interval and time zone. A missing legacy
proof on a currently mastered pair with an eligible reward can be reconstructed
from that pair's history. Pair drilldown replays its attempts on demand.

## Column arithmetic stores

| Store | Key and contents |
| --- | --- |
| `columnSessions` | Embedded session ID. Stores the canonical snapshot and local owner and revision. A unique sparse `openOperation` index exists on open rows. An operation/start-sequence index supports history reads. |
| `columnAttempts` | Immutable session/ordinal/check ID, indexed by session and operation/sequence. Stores the exact input, active time, hint exposure, result and time evidence for each check. |
| `columnProgress` | Operation and skill. Stores counts, recent first checks, latest practice, supporting solutions and current retained evidence. |
| `columnJournal` | Contiguous sequence across both operations. Stores the session ID, event time, event type and its inputs for exact policy replay. |
| `columnSeen` | Operation. Packed canonical pair index for exercises already issued, including skipped or abandoned examples. |
| `columnState` | `state` singleton. Stores the local generation, last committed sequence and effective time watermark. |

The v3 envelope carries canonical column sessions, attempts, progress and
journal. The session wrapper, seen index and state are device-local. Full
restore rebuilds the pair bitmaps and cursor and assigns a new generation. See the
[column engine and storage contract](COLUMN-ARITHMETIC.md).

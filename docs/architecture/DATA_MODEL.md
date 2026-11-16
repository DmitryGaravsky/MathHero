# Data model

Status — active schema reference for MathHero 1.1.

IndexedDB schema v4 contains eight stores. The v2 backup envelope contains
the first seven. One attempt references a session and records both the
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

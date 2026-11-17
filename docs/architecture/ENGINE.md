# Engine boundaries and policy compatibility

Engine reference for MathHero 1.2.

- `core` defines the multiplication exercise contract and reusable clock and
  random-source contracts.
- `multiplication` generates all 144 directed facts and canonicalizes reversed
  factors into 78 pairs. It supplies evaluation and the catalog used by diagnosis
  and the adaptive scheduler.
- `sessions` creates the shuffled diagnostic, advances its phases, computes
  baseline statistics and provides the active timer.
- `learning` implements session transitions, selection, interval changes,
  mastery, pair evidence, analytics and deterministic reward replay.
- `column` defines its own addition and subtraction exercises, entry state,
  regrouping steps, selection, evidence and deterministic journal replay.

The engine depends on data passed into it. Keep React, the DOM, Dexie and
browser storage outside this boundary. Inject clocks and random sources to make
scheduling and history reproducible. Ask repositories to assemble the correct
read model and apply engine results inside transactions.

The [practice rules](../pedagogy/ADAPTIVE_TRAINING.md) document registered
policies v1 and v2. Existing policy v1 sessions keep the published selection,
progress, summary and reward semantics. Old-only replay retains the published
records. Policy v2 adds the ordinary-practice first-slot rule and optional
retention cache without changing the original mastery or rewards. A mixed
journal is replayed in sequence using each attempt's saved session policy.
The additional parent evidence can be derived from old records.

A future policy change needs an explicit registered version, compatibility
tests for historical sessions and backups, and a decision about mixed replay.
Preserve fact IDs and canonical identities. Column arithmetic stores policy
version 1 with its own exercise IDs and journal. Its [contract](COLUMN-ARITHMETIC.md)
describes which parameters and transitions future versions must replay.

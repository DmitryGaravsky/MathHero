# Architecture decisions

This record preserves MathHero 1.1 decisions. MathHero 1.2 adds the
[column arithmetic contract](../COLUMN-ARITHMETIC.md).

| Decision | Reason and consequence |
| --- | --- |
| Keep history on the device | The app can practice offline without accounts, telemetry or a backend. Browser storage can be lost, so versioned backups are portable. |
| Use hashes and separate the two mode shells | Static Pages hosting needs no route rewrites. The app can guard parent destinations and return to the previous child screen without deleting history. |
| Use a four-digit local PIN with a deliberate reset | The gate confirms intent with little friction. Its salted verifier stays local and reset can return to the default without erasing learning data. |
| Use a transactional journal and replay registered policies | A commit sequence protects the interpretation of old records across wall-clock changes. Keep published policy snapshots and validate portable history before replacement. |
| Choose one oldest due mastered pair first in ordinary v2 practice | A review has an opportunity in a normal-length session. Parent Retained evidence also checks the real elapsed gap. The original reward ledger keeps its published rules. |
| Let a complete service worker update wait for its clients | An update can replace a whole cached version after all app windows close, preserving active practice and the database. |

See [data and storage](../STORAGE.md), [policy compatibility](../ENGINE.md) and
[release behavior](../../development/RELEASE.md) for the implementation contracts.

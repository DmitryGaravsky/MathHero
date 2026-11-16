# Column arithmetic — delivery and acceptance

Status: active implementation plan. Prepared 16 November 2026 (Europe/Paris).
Baseline: accepted MathHero 1.1, main `9792b9d`; published app `9309abde58cff9c001e7944f29d2b727965ee093`,
worker `01ee92a8204ef083b478`. The completed [1.1 record](DELIVERY-1.1.md)
remains historical evidence for that release.

## Authorization and sources

The user approved the exercise mockup, manual marks, three-digit operands and
illustrated module cards in design chat `01a1e442-2701-7550-bb25-90f67cf0d092`,
then explicitly requested implementation and review in the coordinating chat.
The coordinator read the original user messages before starting implementation.
The active source is [the approved specification](product/REQUIREMENTS-COLUMN-ARITHMETIC.md).
Local design references are `module-navigation.html` and
`three-digit-practice.html` under the design chat's visualization directory.
Their prototype checks are not application or physical-device acceptance.

The child already knows regrouping and needs practice. Start both operations
with operands 100–999, independent entry and no automatic hints. Addition
permits a four-digit result; subtraction is nonnegative and permits zero.
Manual ones mark receiving carry places, including thousands; manual dots
mark lending places, including a zero in a borrow chain. Check the final number,
not the optional notes. Hints remain separately recorded after resume.

## Coordination and integration

Use sequential Sol stage chats in the shared checkout. Review and correct each
stage, run its required checks, and merge its PR into `release/column-arithmetic`
before starting the dependent stage. Only the accepted complete release reaches
main and GitHub Pages. Stage workers do not commit, push, publish or create chats.
The coordinator owns this record and Git operations. Target version: 1.2.0.

| Stage | Deliverable | State / chat / PR |
| --- | --- | --- |
| 1. Engine and contracts | Arithmetic, digit/mark state, generator, pilot adaptation/evidence and replay contracts | Coordinator review accepted; PR CI pending / 01a1e52e-d374-7d80-af58-7020b90a4c43 |
| 2. Persistence and compatibility | Additive stores, owned transactions, resumable drafts, validated backups and native 1.1 upgrade | Pending |
| 3. Child experience | Illustrated home, two-action entry, column exercise, manual marks, hints, pause and offline resume | Pending |
| 4. Parent experience | Separate addition/subtraction evidence, history and difficulties; locale/theme/accessibility review | Pending |
| 5. Release | Current documentation/screenshots, full regression, upgrade/PWA acceptance, CI and publication | Pending |

## Implementation decisions to verify

- Reuse the shell, settings, localization, PWA and appropriate input/timing
  infrastructure; keep the mathematical engine independent of UI and storage.
  Extend only what this module needs. Keep multiplication policy versions,
  identities, history, progress and rewards unchanged.
- Column sessions and evidence are separate from multiplication and from each
  other operation. Do not transplant the 3-second threshold, 24-question length,
  canonical-pair mastery or multiplication rewards into this module.
- Stage 1 must define bounded pilot session and review parameters, repeated
  independent evidence across days, fresh operands for checks and cautious
  interpretations of errors. Speed remains descriptive on comparable examples.
  Record chosen parameters and rationale as product decisions, not educational norms.
- Preserve the user's own marks and the complete current draft atomically.
  Background, covered views and feedback do not accrue answer time. Automatic
  advance cannot reclaim ownership or advance a paused/restored snapshot.
- Legacy v1/v2 imports should replace their multiplication/common-preference
  scope while preserving column history; the confirmation must state that scope.
  The new backup replaces both modules atomically after complete validation.
  Keep the PIN local. Stage 2 must prove these contracts and reject inconsistent
  history, forged evidence and unknown policy versions before replacement.
- Reuse the approved code-native illustration design. No new backend, accounts,
  child identifiers, telemetry or cloud synchronization.

## Acceptance checklist

- [ ] Approved illustrated cards and exercises are reachable within two actions.
- [ ] Both operations start independently with two three-digit operands.
- [ ] Right-to-left digit entry, selection, replacement, erase and explicit zero work.
- [ ] Manual carry ones and borrow dots are editable and do not count as hints.
- [ ] `586 + 647 = 1233` and `604 − 187 = 417` work with the approved notation.
- [ ] `199 + 205 = 404`, `501 − 492 = 9` and `304 − 304 = 0` work.
- [ ] Mid-example digits, marks, active place, phase and help survive pause, mode/operation changes and offline restart.
- [ ] Correct feedback advances only while active; errors preserve the draft and permit deliberate correction/help.
- [ ] First-check accuracy and independence cannot be inflated by hints, retries or duplicate writes.
- [ ] Selection revisits difficulties with fresh operands and tests retained skills across real gaps and days.
- [ ] Parent evidence and history distinguish the two operations and remain separate from multiplication.
- [ ] ES/RU, all themes, touch/physical keyboard and phone/tablet orientations work.
- [ ] The published 1.1 native database upgrades without loss of multiplication records or unfinished practice.
- [ ] Old and new backups follow the documented scope, validation and atomicity rules.
- [ ] Multiplication, ownership, timing, offline caching and update behavior retain their regressions checks.
- [ ] Current English documentation, real screenshots, CI and live release checks are complete.

Physical iPhone/iPad acceptance of this new module remains separate and pending.
The user's completed 1.1 device sign-off does not cover these future changes.

## Stage 1 review

The coordinator reviewed the arithmetic, editable draft, selection, session and
replay code and the [handoff](stages/column-arithmetic/01-engine.md). Corrections
use recorded local calendar days, retain wrong first checks even after help,
clear current evidence after regression, and anchor reviews to the last actual
practice. Tests cover these cases and backward clocks. Pilot defaults are six
examples, two supporting days, a 24-hour initial review gap and 72-hour later
gap; these are product parameters, not validated educational norms.

Local type checking, lint and production build passed; 82 tests passed, including
14 new column tests. The arithmetic test checked all 1,215,450 valid operand
pairs and their intermediate carry/borrow steps. The unchanged application
build still has the published 1.1 worker revision. Persistence, browser/PWA,
native upgrade and full product acceptance remain subsequent work. Stage PR CI
must pass before the persistence stage starts.

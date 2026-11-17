# Column arithmetic — delivery and acceptance

Status: MathHero 1.2.0 accepted, merged into main and published on Pages.
Automated and public HTTPS/offline checks passed; physical 1.2 iPhone/iPad
acceptance remains pending. Prepared 16 November 2026; software release
completed 17 November 2026 (Europe/Paris).
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

Five sequential Sol stage chats used the shared checkout. The coordinator
reviewed and corrected each stage, verified its checks and merged its PR into
`release/column-arithmetic` before starting the dependent stage. Only the
accepted complete release reached main and GitHub Pages. The coordinator
owned Git operations and publication; stage workers did not commit, push,
publish or create chats. Released version: 1.2.0.

| Stage | Deliverable | State / chat / PR |
| --- | --- | --- |
| 1. Engine and contracts | Arithmetic, digit/mark state, generator, pilot adaptation/evidence and replay contracts | Accepted, merged / 01a1e52e-d374-7d80-af58-7020b90a4c43 / [PR #8](https://github.com/DmitryGaravsky/MathHero/pull/8) |
| 2. Persistence and compatibility | Additive stores, owned transactions, resumable drafts, validated backups and native 1.1 upgrade | Accepted, merged / 01a1e548-4398-7912-899c-29fcf66d4054 / [PR #9](https://github.com/DmitryGaravsky/MathHero/pull/9) |
| 3. Child experience | Illustrated home, two-action entry, column exercise, manual marks, hints, pause and offline resume | Accepted, merged / 01a1e571-69fd-7001-b774-70b183ec8f33 / [PR #10](https://github.com/DmitryGaravsky/MathHero/pull/10) |
| 4. Parent experience | Separate addition/subtraction evidence, history and difficulties; locale/theme/accessibility review | Accepted, merged / 01a1e610-33d3-7080-bd92-393d920d638c / [PR #11](https://github.com/DmitryGaravsky/MathHero/pull/11) |
| 5. Release | Current documentation/screenshots, full regression, upgrade/PWA acceptance, CI and publication | Accepted, merged and published / 01a1e648-ae08-7220-b023-718fcce674e5 / [PR #12](https://github.com/DmitryGaravsky/MathHero/pull/12) |

## Accepted implementation contracts

- Reuse the shell, settings, localization, PWA and appropriate input/timing
  infrastructure; keep the mathematical engine independent of UI and storage.
  Extend only what this module needs. Keep multiplication policy versions,
  identities, history, progress and rewards unchanged.
- Column sessions and evidence are separate from multiplication and from each
  other operation. Do not transplant the 3-second threshold, 24-question length,
  canonical-pair mastery or multiplication rewards into this module.
- Stage 1 defined bounded pilot session and review parameters, repeated
  independent evidence across days, fresh operands for checks and cautious
  interpretations of errors. Speed remains descriptive on comparable examples.
  The parameters and rationale are product decisions, not educational norms.
- Preserve the user's own marks and the complete current draft atomically.
  Background, covered views and feedback do not accrue answer time. Automatic
  advance cannot reclaim ownership or advance a paused/restored snapshot.
- Legacy v1/v2 imports replace their multiplication/common-preference
  scope while preserving column history; the confirmation must state that scope.
  The new backup replaces both modules atomically after complete validation.
  Keep the PIN local. Stage 2 verified these contracts and rejection of
  inconsistent history, forged evidence and unknown policy versions before replacement.
- Reuse the approved code-native illustration design. No new backend, accounts,
  child identifiers, telemetry or cloud synchronization.

## Acceptance checklist

- [x] Approved illustrated cards and exercises are reachable within two actions.
- [x] Both operations start independently with two three-digit operands.
- [x] Right-to-left digit entry, selection, replacement, erase and explicit zero work.
- [x] Manual carry ones and borrow dots are editable and do not count as hints.
- [x] `586 + 647 = 1233` and `604 − 187 = 417` work with the approved notation.
- [x] `199 + 205 = 404`, `501 − 492 = 9` and `304 − 304 = 0` work.
- [x] Mid-example digits, marks, active place, phase and help survive pause, mode/operation changes and offline restart.
- [x] Correct feedback advances only while active; errors preserve the draft and permit deliberate correction/help.
- [x] First-check accuracy and independence cannot be inflated by hints, retries or duplicate writes.
- [x] Selection revisits difficulties with fresh operands and tests retained skills across real gaps and days.
- [x] Parent evidence and history distinguish the two operations and remain separate from multiplication.
- [x] ES/RU, all themes, touch/physical keyboard and phone/tablet orientations work in automated browser profiles.
- [x] The published 1.1 native database upgrades without loss of multiplication records or unfinished practice.
- [x] Old and new backups follow the documented scope, validation and atomicity rules.
- [x] Multiplication, ownership, timing, offline caching and update behavior retain their regression checks.
- [x] Current English documentation, real screenshots, CI and live release checks are complete.

Physical iPhone/iPad acceptance of this new module remains separate and pending.
The user's completed 1.1 device sign-off does not cover the new module.

## Stage 1 review

The stage reviews below record decisions and results at each integration
milestone. Final publication evidence appears under Main release and publication.

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
build still had the published 1.1 worker revision. Persistence, browser/PWA,
native upgrade and full product acceptance were subsequent work. Stage PR CI
passed before the persistence stage started. [Run 43911129345](https://github.com/DmitryGaravsky/MathHero/actions/runs/43911129345)
passed 82 unit tests, 218 browser checks, 10 PWA checks and six native MVP
upgrade checks. The six pre-existing duplicate-diagnosis skips remain unchanged.
PR #8 merged into integration as `2eec760`; main and Pages were not changed.

## Stage 2 review

The coordinator reviewed the additive v5 schema, repository ownership and
transaction boundaries, bounded pair index, strict v3 replay, legacy restore
scope and [handoff](stages/column-arithmetic/02-persistence.md). Full restores
rotate the local generation; old copies preserve every column record. Column
rules are unchanged; validators now also reject malformed in-memory arrays.

Local type checking, lint and build passed, with 90 unit/repository tests,
40 targeted browser checks, 10 PWA checks and 10 native upgrade checks. In both
Chromium and WebKit, the actual published 1.1 UI created a native database with
draft, feedback, evidence, rewards, preferences and a custom PIN. Every old
store's metadata and rows survived the upgrade. At the coordinator's request,
the tests also imported that published app's actual v2 export through the
candidate UI, compared its data and verifier bytes, and resumed practice.
All dates and scripted answers are test fixtures, not child learning records.

At this stage the CI command built both published baselines and ran ten
upgrade checks. Full browser regression was required in stage PR CI before
starting the child interface stage. No new module device acceptance was claimed.

The initial stage CI run `43916856310` found eight failures in an existing PIN
test because the native snapshot helper now includes verifier type metadata.
The correction checks the actual IndexedDB row's keys before serialization,
as well as the byte types and lengths. All eight affected browser profiles,
type checking and lint passed locally. Product storage and the helper's default
output remain unchanged. [Corrected CI run 43919015602](https://github.com/DmitryGaravsky/MathHero/actions/runs/43919015602)
passed 90 unit/repository tests, 226 browser checks, 10 PWA checks and 10 native
upgrade checks. The six existing duplicate-diagnosis skips are unchanged.
PR #9 merged into integration as `27f90a0` before stage 3 started.

## Stage 3 review

Coordinator review covered the operation routes, persistent controllers,
serialized checkpoints and release, exact ownership checks, optional marks,
keyboard focus and worked explanations. Corrections cover quick exit/reentry
while storage is pending, interrupted entry, and selecting an answer cell with
Tab before typing. Pause and Save and exit remain the two visible practice
actions; Skip and End are secondary actions on the paused screen and use its
exact unowned snapshot.

The coordinator inspected actual phone screenshots of the illustrated home,
marked `586 + 647` addition and marked `604 − 187` subtraction in light Spanish
and dark Russian, plus tablet layouts, the worked borrow-through-zero
explanation and paused actions. These match the approved visual direction.

Local type checking, lint, build, 98 unit tests, 10 PWA checks and 10 native
upgrade checks passed. The full browser run recorded 280 passes, including all
56 new column checks across eight profiles, and six existing skips. Two WebKit
phone-landscape theme tests timed out during host suspension; both passed in
a focused rerun on the same build. This interrupted run is not represented as
a clean full pass. The coordinator accepted the implementation and
[handoff](stages/column-arithmetic/03-child-experience.md), subject to complete
green PR CI before integration and the parent stage.

[CI run 43947574283](https://github.com/DmitryGaravsky/MathHero/actions/runs/43947574283)
completed cleanly: 98 unit tests, 282 browser checks, 10 PWA checks and 10 native
upgrade checks passed. The six existing duplicate-diagnosis skips remain.
PR #10 merged into integration as `d842c5d` before stage 4 started. Main and
Pages still contained the accepted 1.1 release at that milestone.

## Stage 4 review

Coordinator review covered the indexed operation reads, denominators, cumulative
active-time accounting, journaled help, sequence-ordered history and reconstruction
of earlier dated evidence. Timing groups also distinguish result length, so a
one-digit result is not compared with three-digit entry. The latest 100 recorded
checks define the timing sample before filtering for independent first checks.

The coordinator inspected actual phone/tablet ES/light and RU/dark summaries,
an unfinished example with help opened after its wrong check, expanded skill
dates and historical proof after regression. These views clearly separate
current evidence from past checks. Local verification passed 103 unit tests,
306 browser checks, 10 PWA checks and 10 native upgrade checks, with the six
existing duplicate-diagnosis skips. The report's 24 new browser checks cover
all eight profiles. The final Russian date punctuation correction passed the
eight focused proof cases, PWA checks and native upgrades on the final build.
The coordinator accepted the [handoff](stages/column-arithmetic/04-parent-experience.md)
and implementation. Stage PR CI was required before integration.

[CI run 43959611017](https://github.com/DmitryGaravsky/MathHero/actions/runs/43959611017)
passed 103 unit tests, 306 browser checks, 10 PWA checks and 10 native upgrade
checks on the final stage commit. The six existing duplicate-diagnosis skips
remain. PR #11 merged into integration as `a252ef9` before release preparation.

## Stage 5 review

The coordinator reviewed the 1.2.0 metadata, current English documentation,
separate pending device checklist and actual screenshots of both modules.
Dependency versions are unchanged. The candidate worker is
`d8377b92265b069a569b`; nine precached assets include the unchanged stage 4
JS and CSS bundles. The JS is 160.05 kB gzip, 21.00 kB more than published 1.1.
The build's 500 kB raw-chunk warning remains documented in the
[handoff](stages/column-arithmetic/05-release.md).

Local type checking, lint, 103 unit tests, build, 10 PWA checks and 12 native
upgrade checks passed. The full browser run recorded 304 passes, six existing
skips and two Chromium tablet theme timeouts spanning a roughly five-hour
gap in test activity. Both affected cases passed on the identical candidate
in a focused rerun. This interrupted local run is not a clean full pass;
complete green PR CI on the stage commit was required before integration.

The added natural 1.1 worker update test preserves two old clients until they
close, observes normal activation outside the app scope, and launches the
candidate offline. It compares all old native stores and every cached asset
hash, verifies saved preferences and the custom PIN, resumes the multiplication
draft, and saves and reopens a marked column draft with incorrect feedback and
prior help. Both Chromium and WebKit passed. The completed 1.1 device record
is unchanged; [physical 1.2 checks](DEVICE-ACCEPTANCE-1.2.md) remain pending.

[CI run 44042419784](https://github.com/DmitryGaravsky/MathHero/actions/runs/44042419784)
completed cleanly on stage commit `85354725bdad4c49d41b19a70ee522fe82d6a861`:
103 unit tests, all 306 browser checks, 10 PWA checks and 12 native upgrade
checks passed. Six existing duplicate-diagnosis skips remain. PR #12 merged
into integration as `b6baabf`. At that point all five implementation stages
were accepted and the complete release was ready for its main PR and
publication checks, recorded below.

## Main release and publication

[Release PR #13](https://github.com/DmitryGaravsky/MathHero/pull/13) contains
the complete five-stage release. [Its CI run 44095403751](https://github.com/DmitryGaravsky/MathHero/actions/runs/44095403751)
passed lint, type checking, build, 103 unit tests, 306 browser checks, 10 PWA
checks and 12 native upgrade checks on integration commit
`97154b2aa0752287e3c0291dd5d7329f32649490`, with six existing duplicate skips.
The coordinator then merged the PR into main as
`209949cae2f0fa62c44c1c607fc1880ceeac3154` on 17 November 2026.
Rebuilding that main commit reproduced worker `d8377b92265b069a569b` and
the candidate's JS/CSS bundles.

[Main verification and Pages run 44097533703](https://github.com/DmitryGaravsky/MathHero/actions/runs/44097533703)
passed the same 103 unit, 306 browser, 10 PWA and 12 native upgrade checks,
with six existing duplicate skips. The workflow uploaded only verified
`dist/` assets and the Pages deployment succeeded. Version 1.2.0 is live at
[MathHero](https://dmitrygaravsky.github.io/MathHero/).

### Public HTTPS and offline acceptance

The coordinator ran `.playwright/column-live-smoke.mjs` against the public URL
in fresh Chromium and WebKit contexts on 17 November 2026, completing at
14:06:00 and 14:06:12 UTC respectively. Both reported HTML version 1.2.0.
The public worker matched the rebuilt candidate byte for byte, SHA-256
`c5a74c317d8f43ddf06dca85def7da303060902371297d80638c776efcad2b23`.
All nine precached files matched local build bytes. Requests for
`src/main.tsx` and `docs/specification.txt` returned 404.

Both engines completed a multiplication answer and observed automatic advance,
saved the next answer `42`, and saved separate marked addition and subtraction
drafts. PIN `1234` opened parent mode. After choosing Russian and Dark, returning
to child mode preserved the exact subtraction route in its paused state.
A new offline window resumed the same subtraction operands, digits, selected
place and dots; switching operations restored the marked addition draft.
Completing addition advanced to the next example offline, and returning to
multiplication restored its exact question and `42` draft. Russian and Dark
persisted. Neither engine reported a page error. The coordinator inspected the
public WebKit offline screenshot. JSON results and captures are retained
locally under ignored `test-results/column-live-release/`.

The initial public script stopped because the language selector exists in both
the header and Settings. Scoping the test locator to the header resolved the
ambiguity; the complete run above then passed. No product change was needed.
These are desktop browser checks of the deployed release, separate from the
pending physical-device checklist. All five development stages and software
publication acceptance are complete.

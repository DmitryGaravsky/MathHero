# MathHero 1.1 — delivery and acceptance

Status: **acceptance complete**. Published release, all six stages and
user-reported iPhone/iPad acceptance are complete.
Prepared 15 November 2026; release accepted 16 November 2026 (Europe/Paris).
Baseline repository: `3367eb9`; previous published application: `923d1f6`.
The original MVP evidence remains in `DELIVERY.md` as historical evidence.

## Scope and coordination

Implement the user's MathHero 1.1 feedback in six sequential project chats on
`gpt-6.1-sol`. The coordinator reviews each stage, requests corrections, verifies
evidence, and merges a stage PR into `release/mathhero-1.1` before starting its
dependent stage. Final release reaches main/Pages only after full acceptance.
No new operations, backend, accounts, profiles, plugins or generic platform.
All documentation/comments are English; application UI remains ES/RU.

The source feedback is the user attachment named "Technical specification
MathHero 1.1". Stage 1 provided its faithful English repository counterpart in
[the requirements](product/REQUIREMENTS-1.1.md) and mapped them to implementation
and verification. The external attachment itself is not a website asset.

## Decisions from the user

- Use a simple default parent PIN of **1234**. There is no requirement to defend
  against the child. Allow PIN change and deliberate reset without data loss;
  no recovery-code system. Store hashed verification data rather than a plain
  saved PIN. This is a local mode gate, not encryption or an authentication service.
- Correct answers advance automatically after brief confirmation. Incorrect
  answers wait for deliberate action so the child can read the explanation.
- Continue autonomously after these decisions. The coordinator owns routine
  implementation decisions, review, corrections and publication.
- Preserve all existing attempts, progress, achievements, settings, history and
  unfinished sessions. Test previous-version real IndexedDB structures with
  reproducible synthetic learning history; do not access a personal browser or
  claim user-device data was inspected.
- The user's review of the previous release is acknowledged; exact device/OS
  coverage was not supplied, so it is not recorded as a full hardware test matrix.

## Stages

| Stage | Deliverable | State / chat / PR |
| --- | --- | --- |
| 1. Audit | Screens, documents, algorithms, debt, baseline and release requirements | Accepted / 01a1dfe4-77de-7401-aa39-e23055253c8f / [PR 1](https://github.com/DmitryGaravsky/MathHero/pull/1) |
| 2. Architecture | Central settings, modes, parent gate, storage boundaries/migrations | Accepted / 01a1dff0-6e88-7131-abe8-a916c704b53f / [PR 2](https://github.com/DmitryGaravsky/MathHero/pull/2) |
| 3. Child experience | Short entry flow, exercises, automatic feedback, results, achievements | Accepted / 01a1e017-9be1-7173-be21-1064b66d2c7e / [PR 3](https://github.com/DmitryGaravsky/MathHero/pull/3) |
| 4. Parent experience and themes | Complete management, light/dark/system, localization and terminology | Accepted / 01a1e03e-63f6-7242-9592-2b027cfa43c4 / [PR 4](https://github.com/DmitryGaravsky/MathHero/pull/4) |
| 5. Pedagogy | Learned/fluent/retained evidence, retention checks, error/weakness analytics | Accepted / 01a1e3b4-f59b-7971-bf0f-923aef3d047a / [PR 5](https://github.com/DmitryGaravsky/MathHero/pull/5) |
| 6. Documentation and release | Product/user/pedagogy/architecture/developer docs, screenshots, regression, publication | Accepted and published / 01a1e3d6-207f-7cc1-9310-ae56147aa103 / [PR 6](https://github.com/DmitryGaravsky/MathHero/pull/6) |

## Acceptance — 19 of 19 verified for 1.1

- [x] Child mode opens by default.
- [x] Practice begins within two actions.
- [x] Child navigation excludes parent analytics.
- [x] Parent mode retains every existing management function.
- [x] Parent entry requires the simple PIN gate.
- [x] Returning to child mode takes one action.
- [x] Switching modes preserves the session and appropriate child screen.
- [x] System/light/dark theme preferences work and persist.
- [x] Both themes cover every screen and state with accessible contrast.
- [x] ES/RU localization is complete.
- [x] Existing multiplication behavior has no regression.
- [x] Diagnosis, intervals and mastery are preserved and improvements tested.
- [x] History and achievements are preserved.
- [x] Previous data migrates successfully.
- [x] Backup export/import remains compatible and atomic.
- [x] Automated checks actually pass.
- [x] README and documentation match implemented behavior.
- [x] Historical/obsolete documents are identified and marked.
- [x] Architectural boundaries and dependencies are documented.

The functional checks above use the accepted stage evidence below and the full
stage 5 CI run. Theme coverage includes rendered contrast measurements and manual
screenshot review, not a claim of complete accessibility certification. Physical
iPhone/iPad acceptance remains distinct from Chromium/WebKit mobile emulation.
Stage 6 documentation, release CI and published-site smoke checks are accepted.
Publication evidence and the separate user-reported physical-device sign-off
follow below. Stage sections preserve the evidence available at each handoff.

| Criteria | Acceptance evidence |
| --- | --- |
| 1–3: child entry/navigation | [Stage 3](stages/1.1/03-child.md); browser `childExperience`, `modes` |
| 4–7: parent functions/PIN/return/session | [Stages 2](stages/1.1/02-architecture.md) and [4](stages/1.1/04-parent-themes.md); browser `modes`, `parentExperience`, `childExperience` |
| 8–10: themes/locales | [Stage 4](stages/1.1/04-parent-themes.md) and [5](stages/1.1/05-pedagogy.md); browser `themeVisuals`, `pairEvidence`; locale parity |
| 11–12: mathematics/learning | [Stage 5](stages/1.1/05-pedagogy.md); deterministic engine/profile/evidence tests and complete diagnosis in both engines |
| 13–15: preservation/backup | [Stage 2](stages/1.1/02-architecture.md) and [5](stages/1.1/05-pedagogy.md); native pinned-release upgrade, mixed-policy replay, transactional restore |
| 16: automated verification | Accepted stage CI runs linked below; no new skips |
| 17–19: documentation/history/architecture | [Stage 6](stages/1.1/06-docs-release.md); [documentation index](README.md), source review, four real screenshots, link/comment/locale/dependency audits |

## Stage 1 acceptance

Reviewed the English 12-section requirements and all 19 verification mappings,
screen/document inventory, policy/storage contracts and migration recipe.
Baseline build/types/lint, 54 unit, 114 browser and 10 PWA checks passed; six
intentional redundant full-diagnosis skips remain. No product changes. Key review
focus for stage 2: shell/overlay timing and asynchronous session ownership,
settings repository boundaries, legacy backup decoding and native v3 upgrade.

## Stage 2 acceptance

Reviewed mode routing, the simple local PIN gate, centralized settings, additive
database v4, legacy backup import, transaction cancellation and session ownership.
Corrections include localized malformed-PIN feedback, atomic cancellation while
the gate covers practice, automatic-advance ownership guards, and canonicalizing
reversed factor IDs before claiming a targeted session. The coordinator reran
all 60 unit tests successfully after the last correction.

Local build/types/lint passed, alongside 138 browser checks (six baseline
redundant skips), 10 PWA checks and 6 native-upgrade checks. The pinned published
build produced synthetic history through its actual UI: 9 sessions, 35 attempts,
35 journal entries and 18 rewards in each engine. All seven legacy stores and
their records survived the additive upgrade. Legacy import preserved the local
PIN, and an old installed worker updated naturally with offline state intact.
The reusable upgrade suite is included in CI. See the stage handoff for exact
fixtures and remaining stage-specific work. No physical-device claims are made.

[GitHub CI run 43736486605](https://github.com/DmitryGaravsky/MathHero/actions/runs/43736486605)
passed every verification job on Ubuntu, including the native-upgrade suite.
PR 2 merged into the integration branch as `449ef3d`; Pages was not deployed.

## Stage 3 acceptance

Reviewed the child home, two-action start/resume, focused progress queries,
visual achievements, concise evidence-based results and optional error correction.
Correct feedback advances after 800 ms using the exact owned session snapshot.
Incorrect feedback and restored feedback from another view require deliberate
continuation. The coordinator requested and reviewed a live two-tab timer race,
automatic final-answer summary, zero-answer result and landscape input-fit checks.

Build/types/lint, 61 unit, 178 browser (six baseline skips), 10 PWA and 6 native
upgrade checks passed locally. Final screenshot review identified a clipped answer
field in phone landscape; the corrected equation, input including focus outline,
and keypad now fit with at least 12 CSS px below them and 44 px minimum keypad
targets. All 18 affected Chromium/WebKit landscape checks and build/lint passed
after that CSS correction. Parent analytics and the learning/storage policies
remain intact. See `stages/1.1/03-child.md` for actual artifacts and limitations.

[GitHub CI run 43740382611](https://github.com/DmitryGaravsky/MathHero/actions/runs/43740382611)
passed all verification steps on Ubuntu. PR 3 merged into the integration branch
as `d8cd3c2`. Main and Pages remain on the published MVP until final acceptance.

## Stage 4 acceptance

Reviewed dedicated parent destinations, guarded routes, one-action return,
focused data reads, history drilldown, native theme resolution and centralized
palette tokens. All prior management functions remain available. ES/RU formatting
and an opt-in Spanish/Russian glossary are implemented. The coordinator requested
clear finished-versus-saved wording and reviewed actual light/dark captures.
Final corrections cover the landscape PIN reset action, native WebKit selects,
return-button border contrast and Russian quantity wrapping.

Build/types/lint and 61 unit tests passed. The full browser matrix passed 210
checks with six baseline skips; the final presentation changes passed 26 targeted
checks. PWA passed 10 and native published-release upgrade passed 6. The rendered
contrast audit contains 844 readings: minimum normal text 6.29:1 light / 7.30:1
dark, and meaningful large-text/control/graphic samples 4.13:1 / 5.42:1.
This is measured coverage, not a full accessibility certification. The stage
handoff records screenshots and exact checks. Static inspection found no import
cycles or engine dependencies on UI/storage, and 238 matching locale keys.

[GitHub CI run 43838831378](https://github.com/DmitryGaravsky/MathHero/actions/runs/43838831378)
passed every verification step on Ubuntu in 12m42s. PR 4 merged into the release
integration branch as `f8ce9ce` on 16 November 2026; publication remains deferred.

## Stage 5 acceptance

Reviewed Learned/Fluent/Retained evidence, conservative error observations,
policy v2 due-first selection, optional retention cache and exact historical
policy replay. Coordinator corrections require consistent recent accuracy and
an actual full elapsed interval since the last practice attempt; a near-due
rehearsal cannot masquerade as delayed retention. Original mastery, interval
transitions and reward ledger rules remain compatible. The coordinator inspected
populated Russian light overview and Spanish dark weakness captures.

Build/types/lint, 68 unit/repository, 218 browser (six baseline skips), 10 PWA and
6 native published-release upgrade checks passed. Mixed v1/v2 round trips reject
forged proof and altered policies; native old history exposes its genuine 14-day
check without rewriting old records. Deterministic 14/30-day checks fit within
24 questions, and all three 90-day synthetic profiles cover 78 pairs/144 directions.
See `stages/1.1/05-pedagogy.md` for thresholds, evidence and limitations.

[GitHub CI run 43844887311](https://github.com/DmitryGaravsky/MathHero/actions/runs/43844887311)
passed all verification steps on Ubuntu in 8m17s. PR 5 merged into the release
integration branch as `0a2bcfd` on 16 November 2026.

## Stage 6 acceptance

Reviewed the current product, user, pedagogy, architecture and development guides
against the implementation. Historical MVP and intermediate stage records keep
their actual outcomes and link to current authority. The README is concise and
contains four inspected real app captures covering both modes and themes; parent
figures come from validated synthetic history. Corrected the first-attempt repeat
wording to match the scheduler exactly. Version metadata is 1.1.0 with unchanged
dependency versions. English documentation and source comments remain separate
from the ES/RU product translations.

Clean npm installation, build/types/lint and 68 unit/repository tests passed.
The full browser matrix passed 218 checks with six baseline skips, PWA passed 10,
and native published-release upgrade passed 6 using an isolated old lockfile
installation. The clean rebuilt worker remains `01ee92a8204ef083b478`. Reviewed
956 rendered contrast samples, 259 matching locale keys, local links, comment
audit and an acyclic 65-module dependency graph with no engine boundary violations.
The stage handoff records exact evidence; real iPhone/iPad testing stays pending.

[GitHub CI run 43848703530](https://github.com/DmitryGaravsky/MathHero/actions/runs/43848703530)
passed all verification steps on Ubuntu in 7m55s. PR 6 merged into the release
integration branch as `17d24d0` on 16 November 2026. The coordinator's final
documentation audit checked 124 local references after adding acceptance links.

## Final release

[Release PR 7](https://github.com/DmitryGaravsky/MathHero/pull/7) passed
[CI run 43850139567](https://github.com/DmitryGaravsky/MathHero/actions/runs/43850139567)
in 7m54s and merged into main as
`9309abde58cff9c001e7944f29d2b727965ee093` on 16 November 2026.
All six stage chats and their PRs are recorded above. The release preserves
the published MVP data contracts while introducing the reviewed 1.1 behavior.

[Main verification and Pages deployment run 43851420146](https://github.com/DmitryGaravsky/MathHero/actions/runs/43851420146)
passed: verification took 8m2s and deployment 9s. Only the verified `dist/`
artifact was published to [MathHero](https://dmitrygaravsky.github.io/MathHero/).
The deployed application commit is `9309abde58cff9c001e7944f29d2b727965ee093`.
Its worker revision is `01ee92a8204ef083b478`; the downloaded worker exactly
matches the locally verified build, SHA-256
`9033afd081afef050a4b93134abe1a6594ba94ee858cde160f2d68abb3295a97`.

Live HTTPS smoke checks passed in fresh Chromium and WebKit contexts on
16 November 2026 at 10:52 UTC (11:52 Europe/Paris). Both verified default child
entry, a two-action practice start, automatic advance after a correct answer,
default PIN 1234, persisted Russian/dark settings, and the same question and
draft after closing the page and opening a new window offline. No page-script
errors occurred. The manifest scope is `/MathHero/`; unbundled `src/main.tsx`
and `docs/specification.txt` requests returned 404. The coordinator inspected
the live WebKit offline-resume capture. JSON evidence and screenshots are in
the ignored local `test-results/live-release/` directory.

The final source contains 68 passing unit/repository tests, 218 passing browser
checks, 10 passing PWA checks and 6 passing native upgrade checks. Six existing
duplicate full-diagnosis cases remain intentionally skipped; no new skips were
introduced. Physical iPhone/iPad acceptance was subsequently confirmed by the
user, as recorded below. Documentation updates record these outcomes without
changing the deployed application assets.

## Physical-device sign-off

On 16 November 2026 (Europe/Paris), after receiving the short post-update
checklist, the user confirmed that MathHero works on both iPhone and iPad and
explicitly requested that MathHero 1.1 acceptance be marked complete. No issues
were reported. This is user-reported overall acceptance on real devices;
models, OS versions, per-case results and startup measurements were not supplied.
See the [device acceptance record](DEVICE-ACCEPTANCE.md).

**MathHero 1.1 acceptance is complete:** all 19 implementation criteria, the six
reviewed stages, automated verification, publication, live-site smoke checks
and the user's physical-device sign-off are recorded. The functionality is
already merged into `main` through PR 7 and deployed; no further functional
merge is required for this release.

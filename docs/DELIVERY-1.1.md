# MathHero 1.1 — delivery and acceptance

Status: active release plan. Prepared 15 November 2026 (Europe/Paris).
Baseline: `3367eb9`; deployed application: `923d1f6`.
The original MVP evidence remains in `DELIVERY.md` as historical evidence.

## Scope and coordination

Implement the user's MathHero 1.1 feedback in six sequential project chats on
`gpt-6.1-sol`. The coordinator reviews each stage, requests corrections, verifies
evidence, and merges a stage PR into `release/mathhero-1.1` before starting its
dependent stage. Final release reaches main/Pages only after full acceptance.
No new operations, backend, accounts, profiles, plugins or generic platform.
All documentation/comments are English; application UI remains ES/RU.

The source feedback is the user attachment named "Technical specification
MathHero 1.1". Stage 1 will provide its faithful English repository counterpart
and map requirements to implementation/verification. Do not publish the external
attachment itself as a website asset.

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
| 2. Architecture | Central settings, modes, parent gate, storage boundaries/migrations | Local review accepted; CI pending / 01a1dff0-6e88-7131-abe8-a916c704b53f |
| 3. Child experience | Short entry flow, exercises, automatic feedback, results, achievements | Pending |
| 4. Parent experience and themes | Complete management, light/dark/system, localization and terminology | Pending |
| 5. Pedagogy | Learned/fluent/retained evidence, retention checks, error/weakness analytics | Pending |
| 6. Documentation and release | Product/user/pedagogy/architecture/developer docs, screenshots, regression, publication | Pending |

## Acceptance — 0 of 19 verified for 1.1

- [ ] Child mode opens by default.
- [ ] Practice begins within two actions.
- [ ] Child navigation excludes parent analytics.
- [ ] Parent mode retains every existing management function.
- [ ] Parent entry requires the simple PIN gate.
- [ ] Returning to child mode takes one action.
- [ ] Switching modes preserves the session and appropriate child screen.
- [ ] System/light/dark theme preferences work and persist.
- [ ] Both themes cover every screen and state with accessible contrast.
- [ ] ES/RU localization is complete.
- [ ] Existing multiplication behavior has no regression.
- [ ] Diagnosis, intervals and mastery are preserved and improvements tested.
- [ ] History and achievements are preserved.
- [ ] Previous data migrates successfully.
- [ ] Backup export/import remains compatible and atomic.
- [ ] Automated checks actually pass.
- [ ] README and documentation match implemented behavior.
- [ ] Historical/obsolete documents are identified and marked.
- [ ] Architectural boundaries and dependencies are documented.

Actual stage evidence, review findings, PRs and release checks will be added here.
Physical-device tests remain distinct from Chromium/WebKit mobile emulation.

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

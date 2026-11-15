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
| 1. Audit | Screens, documents, algorithms, debt, baseline and release requirements | Starting |
| 2. Architecture | Central settings, modes, parent gate, storage boundaries/migrations | Pending |
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

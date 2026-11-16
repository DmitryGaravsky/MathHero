# MathHero 1.1 stage 2 — architecture handoff

Status — historical 1.1 stage record. See the
[active 1.1 architecture](../../architecture/OVERVIEW.md).

Working branch `v1.1/02-architecture`. This handoff is for coordinator review.

## Contracts and decisions

- `ChildShell` and `ParentShell` share layout and practice UI. Every new
  page load initializes `AppMode` to child in memory. The child navigation
  contains home, practice and achievements. Results, map, diagnosis, and
  settings and data are parent destinations. Daily and general or targeted
  weak practice share the same persisted streams across modes.
- The hash guard accepts legacy route names and the child and parent
  namespaces. A child landing on a protected hash sees child home and can
  open the PIN dialog for the requested destination. The close or back path
  invalidates the pending gate request. Entering and leaving parent mode
  replaces the mode-switch history entry. Leaving takes one action and
  restores the last child hash, including a canonical weak pair.
- The local confirmation uses four ASCII digits. For a fresh installation
  or a reset, the default is `1234`. An unlocked parent can change it in
  Settings. The entry dialog offers an explicit reset confirmation and then
  returns to PIN entry. A customized PIN gets a random 16-byte salt and a
  versioned 256-bit PBKDF2–SHA-256 verifier with 100,000 iterations. Native
  Web Crypto runs on Pages HTTPS and loopback. The gate confirms a local mode
  switch. [W3C Web Cryptography specification](https://www.w3.org/TR/webcrypto/#pbkdf2)
- `src/settings/preferences.ts` centralizes allowed values, defaults and
  validation. `SettingsRepository` reads and observes committed values through
  Dexie and merges each patch in a transaction with the latest settings row.
  A failed write preserves the last committed UI values. Restore updates the
  live subscription through the same table. The default theme is `system`.
  Both shells expose `data-theme` for stage 4.
- Dexie v4 adds one `parentGate` store. A v3 upgrade keeps the seven previous
  stores and their records intact. Earlier on-device v1 and v2 migrations
  remain in the Dexie version chain. Existing settings rows acquire the
  default theme in memory and on the next settings write or export.
- The backup API accepts the published backup v1 / database 3 envelope and
  writes backup v2 / database 4. Both formats use the seven learning and
  preferences tables. The v2 settings row adds the theme. Validation and
  history replay precede replacement, which runs as one transaction and
  clears imported session owners. A local PIN verifier survives the
  transaction. A fresh device retains its default PIN after import.
- The practice controller separates attachment and activity from manual
  question pause, operation busy state, and feedback phase. Opening the PIN
  dialog immediately pauses question time and queues a native checkpoint.
  Closing it reloads the session on the same destination. Question resume
  remains deliberate, and saved feedback reappears in place. Route unmount,
  shell switch, document visibility and pagehide suspend the controller.
  Pageshow reevaluates visibility. A fresh mount or reactivation queries the
  current persisted stream. Backup restore takes place from parent Settings
  after the practice view detaches. The previous owner cannot write into a
  restored row.
- Suspending a view invalidates its async generation and aborts pending
  start, claim, submit, advance and finish transactions. The native commit
  determines which operation won the race. A completed transaction remains
  durable. A cancelled submit keeps the saved question draft and prevents a
  partial attempt or ledger write. Repository transactions check session ID,
  owner, cursor and phase before writing. Keeping the expected session ID
  allows a claim during an existing session to use a primary-key lookup.
- Eligibility for automatic advance comes from
  `canAdvanceAutomatically(expected)`. It requires an attached and active
  controller, a non-paused exact snapshot with correct feedback, an idle
  operation state, and ownership. `advanceCorrectFeedback(expected)` still
  checks ownership transactionally and uses the current generation signal.

## Previous-release fixture and reproduction

With the root lockfile installed and Playwright Chromium and WebKit
available, run the following commands from the repository root:

```text
npm run build
npm run test:upgrade
```

The upgrade command needs Git history containing
`923d1f634047322e688eafb38679ad3dba66e1d7` and a `tar` executable. It archives
that commit into an ignored `.playwright/legacy-923d1f6-*` directory. It uses
the root dependencies when the lockfiles match and installs the isolated
legacy lockfile when they differ. It asserts the built legacy worker revision
`7a73513eb82bcfc66d1d`. The legacy and candidate are served at the same
`http://127.0.0.1:4175/MathHero/` origin using fresh Playwright contexts. CI
fetches repository history so the archive can be built on release PRs.

The stored-data case uses the old UI to save 24 diagnosis attempts and stop
at the first break. Four early-completed weak sessions precede mastery of
`9 × 9` on October 26, 2026. A correct due review on November 9 earns the
legacy retention reward. The fixture leaves wrong feedback and a repeat
queued for `7 × 8`. It also records four correct adaptive answers including a
slow answer and pauses on the next question with draft `42`. These actions
earn the legacy `first10` achievement. The timezone is Europe/Paris, the
random seed is `20261115`, and the deliberately slow response uses a
6,200 ms test offset in the monotonic clock after the question appears.

The recipe captures the old UI download, native schema, indexes, rows, and
Playwright storage state under `test-results/upgrade/`. It upgrades the same
browser context and compares every legacy store and structured record. It
also resumes the original draft and feedback, imports the old download into
a clean candidate context, and verifies the round-tripped learning tables
and persistent local PIN. A separate case starts an empty old installation.
The worker-enabled case installs the published worker, leaves diagnostic
feedback saved, waits for the candidate worker, releases the old page, and
reopens the candidate offline in the same context. The fixtures come from
synthetic Playwright contexts on loopback.

## Changed files

- Modes and navigation — `src/app/{App.tsx,ModeShells.tsx,router.ts}`,
  `src/components/layout/{AppShell.tsx,Navigation.tsx,LanguageSwitcher.tsx}`,
  `src/features/dashboard/Dashboard.tsx`,
  `src/features/statistics/Achievements.tsx`.
- Settings and PIN — `src/settings/preferences.ts`,
  `src/app/{AppContext.ts,i18n.ts,providers.tsx}`,
  `src/database/{settingsRepository.ts,parentPinRepository.ts}`,
  `src/features/settings/{Settings.tsx,ParentPinDialog.tsx,ParentPinSettings.tsx}`,
  `src/locales/{es,ru}.json`, `src/styles/{global,responsive}.css`.
- Storage and practice — `src/database/{db,backup,sessionTransaction,diagnosticRepository,learningRepository}.ts`
  and `src/features/training/{DiagnosticController.ts,useDiagnostic.ts,Training.tsx}`.
- Acceptance — `tests/{diagnostics,learningPersistence,progressBackup}.test.ts`,
  `tests/{foundation,settingsArchitecture}.test.tsx`,
  `tests/browser/{diagnostics,foundation,learning,modes,progressBackup}.spec.ts`,
  `tests/support/{nativeSnapshot,parentMode}.ts`,
  `tests/pwa/{offline.spec.ts,server.mjs}`,
  `tests/upgrade/previousRelease.spec.ts`, `scripts/test-upgrade.mjs`,
  `package.json`, `tsconfig.json`, `playwright.config.ts`,
  `playwright.upgrade.config.ts` and `.github/workflows/deploy.yml`.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build`, and
  `git diff --check` passed. The candidate worker revision is
  `016d74235ce360ea2d20`. Distribution validation found nine precached
  app assets under `/MathHero/`.
- `npm test` passed 60 tests. This includes on-device schema migration
  contracts exercised with fake IndexedDB, the settings error and restore
  paths, mid-transaction answer cancellation, stale ownership and backup
  replacement rollback. The targeted repository test also claims a session
  opened with a reversed factor ID through the primary-key path.
- `npm run test:e2e` passed 138 checks across Chromium and WebKit phone and
  tablet viewports in both orientations. That includes the 114 baseline
  checks and 24 new mode, gate and overlay checks. The six baseline
  redundant full-diagnosis runs remain intentionally skipped. Both engines
  completed the 144-question flow in phone portrait.
- `npm run test:pwa` passed 10 checks in Chromium and WebKit, including
  new-window offline resume, waiting updates, failed installs and retry.
- `npm run test:upgrade` passed 6 checks in Chromium and WebKit. The
  populated fixture in each engine had 9 sessions, 35 attempts, 35 journal
  entries and 18 rewards. Native IndexedDB reported version 30 before the
  candidate and 40 afterward. The checks included mastery, retention,
  `first10`, the two unfinished practice streams and diagnostic state,
  import and re-export.

## Next stages and acceptance limits

- Stage 3 should schedule correct feedback using the rendered session snapshot
  and cancel scheduled callbacks on activity, snapshot, cursor, or attachment
  changes. Feedback restored after a full remount may belong to an old view
  and can advance by deliberate action. Keep any automatic continuation
  tied to verified ownership. Wrong feedback waits for the child.
- Stage 4 should add resolved light/dark/system styling, device-theme
  tracking and contrast verification using the existing preference and shell
  attribute. Parent information architecture and child-flow polish follow
  their assigned stages.
- Stage 6 still needs physical iPhone and iPad acceptance. Automated
  Chromium and WebKit phone/tablet projects use desktop emulation.

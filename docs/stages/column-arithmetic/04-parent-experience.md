# Stage 4 — column arithmetic parent reports

Status — implemented on `codex/column-04-parent-experience` for coordinator
review. Physical-device acceptance remains open.

## Changed files

| Area | Files and changes |
| --- | --- |
| Parent navigation | `src/app/router.ts`, `src/app/ModeShells.tsx`, `src/components/layout/AppShell.tsx`, `src/features/parent/ParentModules.tsx` add the module selector and PIN-gated operation routes. The selector labels multiplication on its existing report routes. |
| Report data | `src/database/columnParentRead.ts`, `src/database/useParentRead.ts` add indexed, reactive reads for overview, sessions, timing and historical review details. |
| Report views | `src/features/parent/ParentColumnReport.tsx`, `ParentColumnHistory.tsx`, `ColumnProofDetails.tsx`, `useColumnReportFormat.ts`, `src/styles/parent.css`, `src/locales/{es,ru}.json` show the summary, skill disclosures, timing sample and session details in both locales and all themes. |
| Verification | `tests/columnParentRead.test.ts`, `tests/support/columnReportFixtures.ts`, `tests/browser/columnParentReport.spec.ts` build journal-replay fixtures and load them through ordinary validated backup restore. |
| Documentation | `docs/README.md`, `docs/user/PARENT_GUIDE.md`, `docs/pedagogy/{LEARNING_MODEL,COLUMN_ARITHMETIC}.md`, `docs/architecture/COLUMN-ARITHMETIC.md`. |

## Decisions and interpretation

- The column entry opens Addition. The report nav has two operation links
  and hides the multiplication menu while a column report is open. One
  action returns to the multiplication overview. Its existing links retain
  their hashes. The shared PIN gate and App's saved child route preserve the
  exact child operation and committed draft.
- First-check accuracy and independent solves both use checked examples.
  Help counts use issued examples and include journaled exposure after a
  wrong check even when the child never checks again. A correct retry is a
  solve after correction. Manual marks alone preserve independence. Issued,
  checked, unchecked, skipped and unresolved counts are labeled separately.
- Session history orders sessions by start sequence and checks by commit
  sequence, displaying recorded wall times in the session's zone. It uses
  the last captured cumulative active time for each example, including the
  checkpoint of an open draft, and sums each example once.
- Skill details report the latest four first checks on fresh pairs and flag
  two or more observed misses. They show current support and verification
  from the progress table. An expanded historic review session reconstructs
  the dated proof from earlier checks and their issued selections. Past
  evidence can still be inspected after current verification is cleared.
- Timing uses the latest 100 committed checks per operation and includes
  independent correct first checks only. Groups use engine-computed carry
  or borrow places, result length, borrow through zero and zero result.
  Medians and sample sizes describe those examples.
- Sessions and timing are scoped to the selected operation. Session details
  read by ID and load only on expansion. An expanded historical review
  with an independent check can read the preceding first-check history of
  that operation to reconstruct the proof. The views perform no writes or
  ownership claims and require no database or backup migration.

## Verification

| Command | Local result |
| --- | --- |
| `npm run typecheck`, `npm run lint`, `git diff --check` | Passed. |
| `npm test` | 103 passed in 12 files, including five report read-model cases. |
| ES/RU catalog key and placeholder comparison | Passed for all 373 localized strings. |
| `npm run build` | Passed. Worker `aba5c28750f8c5caf7c7` precaches nine app assets at `/MathHero/`. Vite reports a 519 kB minified entry and a chunk-size warning. |
| `npm run test:e2e` | 306 passed in 10 minutes. Six existing duplicate full-diagnosis checks were skipped. |
| Focused `npm run test:e2e -- tests/browser/columnParentReport.spec.ts` | 24 passed across Chromium and WebKit in phone and tablet portrait and landscape. |
| Focused dated current and historical proof on the final copy | Eight passed across all profiles. |
| `npm run test:pwa` | 10 passed in Chromium and WebKit. |
| `npm run test:upgrade` | 10 passed in Chromium and WebKit using the two published baselines and their verified worker revisions. |

The browser cases exercise direct report URLs, aliases, history and reload
through the PIN gate. They check live language and system color changes,
explicit Light and Dark settings, reduced motion, keyboard focus, 44 CSS px
module and operation targets, and horizontal fit. The mixed backup includes
published-policy multiplication data and both column operations. The tests
inspect a restored and resumed draft, verify legacy multiplication metrics
and compare IndexedDB records before and after viewing reports.

Initial focused runs exposed test locator ambiguity, a live timer assertion,
a check that raced hash navigation, and WebKit's default link tabbing
behavior. The final controls have the same explicit keyboard tab stop as the
existing parent links. The checks wait for the target screen and use the
saved checkpoint for the timer comparison.

The full browser run used candidate worker `20506e98d16506953e1f`.
The final copy edit removed doubled punctuation next to formatted Russian
dates in two templates. The focused proof cases, PWA suite and native
upgrade suite all passed on worker `aba5c28750f8c5caf7c7` after the edit.
The final upgrade run reused the verified published fixture builds from
`npm run test:upgrade`.

### Coordinator screenshots

The images are local review artifacts from the built app and the regular
backup import flow. Each run includes all eight profiles.

| Example view | Directory under `test-results/` | Images |
| --- | --- | --- |
| Chromium phone portrait summary | `column-stage4-eight-profiles/columnParentReport-shows-s-b432b-ns-to-the-exact-child-draft-chromium-phone-portrait/` | `report-summary-light-es.png`, `report-summary-dark-ru.png` |
| WebKit tablet portrait history, help after a wrong check then early finish | `column-stage4-eight-profiles/columnParentReport-shows-s-b432b-ns-to-the-exact-child-draft-webkit-tablet-portrait/` | `unfinished-help-light-es.png`, `unfinished-help-dark-ru.png` |
| WebKit tablet portrait expanded review and historical proof after regression | `column-stage4-copy-review/columnParentReport-shows-d-f55bc-oof-even-after-a-regression-webkit-tablet-portrait/` | `skill-proof-light-es.png`, `skill-proof-dark-ru.png`, `historical-proof-after-regression.png` |

## Remaining acceptance

The coordinator owns stage acceptance, the stage PR, integration and release
evidence. The release stage still needs final English documentation and
screenshots, CI, publication and live checks. Physical iPhone and iPad checks
are pending. The browser profiles emulate device dimensions and input and
run on Windows. The 24-hour and 72-hour gaps are pilot product defaults.

# MathHero 1.1 stage 4 — parent experience, themes, and localization

Working branch `v1.1/04-parent-themes`. Handoff for coordinator review.

## Parent experience

- The overview shows confirmed canonical mastery, the reward total, unfinished
  daily and weak practice, and the state of diagnosis. The last completed
  practice summary opens on demand. Earned and locked achievements have their
  own page, reached from the overview.
- Progress has the 144-direction map, five existing states, calibrated text
  and symbols, large factor selectors, and keyboard traversal. Selecting a
  direction displays its equation, status, and attempt history. The paired
  history combines both directions. Practice links for both orientations use
  the same canonical target.
- Analytics shows practice-only accuracy, mean and median correct-response
  times, daily trends, and the active minutes counted toward the daily goal.
  The progress page shows both the directed and canonical counts. Weak spots
  retains the prior ranked list of up to 12 difficult or developing directions,
  with one link per direction to the canonical target and a general weak
  practice action. Evidence definitions and interventions belong to stage 5.
- Diagnosis separates the initial assessment from practice metrics. The report
  presents the recorded result for a partial or complete assessment. A partial
  diagnosis resumes its persisted practice screen. The final result action at
  the end of the 144 questions opens the report.
- History shows newest sessions first and offers a session-type filter.
  Expanding a session reads its own ordered attempts and links to a pending
  session where applicable. Settings and data retains language, daily goal,
  animations, the sound-off state, backup export/validation/restore, PIN
  change, installation and worker-update guidance.
- Tablet landscape and wide screens show the parent destinations inline.
  Narrow phone and tablet layouts use an in-flow disclosure with two columns.
  Keyboard focus enters the revealed links, Escape restores the trigger, and a
  selected destination focuses the main content. Child navigation is still
  the three-item stage 3 flow. Parent release paths are
  `#parent/{home,map,results,weak-spots,diagnosis,history,training,settings}`.
  The previous `results` route is the practice analytics destination.
  All previous protected routes and the new parent-only routes use the PIN
  gate. Reload starts in child mode. The header returns to the stored child
  route in one action and preserves the canonical weak-practice target.

## Data and learning contracts

- Parent screens subscribe to focused queries in
  `src/database/parentReadModel.ts`. Overview reads bounded pair progress,
  session records and the reward total. Diagnosis uses the baseline session
  key and its attempt index. Analytics reads practice-mode records, and
  history and map drilldowns use session and canonical-pair indexes. Only the
  map and weak-spot states need journal-ordered lifetime observations. They
  share the pure projection in `src/engine/learning/analytics.ts`, grouping
  directions once before evaluating status. A minute clock refreshes the
  rendered evidence or current day without fetching the same database data
  again. Achievement pages use the existing reward-kind query.
- Mastery, scheduling, repeat queues, active response timing, and reward
  policy are the accepted stage 3 behavior. Stage 5 can extend the pure
  projections and the analytics/weak-spot screens as the new evidence becomes
  available. Schema v4 and backup v2 stay compatible with the published
  schema v3 and backup v1.
- The entry dialog and settings explain the initial PIN `1234` as a local
  mode-switch confirmation. Custom PIN verification remains hashed. The
  deliberate reset restores the default without deleting progress, and the
  backup path preserves the local PIN verifier.

## Themes and localization

- `src/styles/themes.css` defines the palette for the root canvas, cards,
  dialogs and backdrop, text and links, action and focus colors, inputs,
  native select controls, keypad and feedback, switches, bars, map statuses,
  and mascot surroundings. The app provider resolves the persisted
  System/Light/Dark preference, sets the native color scheme and updates the
  browser theme color. System follows live media changes. Light and Dark
  remain selected when system appearance changes. Reduced motion also applies
  to child feedback and the mascot.
- The default locale remains Spanish. The new screens use the same ES/RU
  catalogs, including error and empty states. Parent dates and metrics use
  locale-aware date, number, and percentage formatting. The child improvement
  sentence uses singular and plural forms in both languages. Early finish
  says that the practice ended, while pause and exit describe the saved state.
- A collapsed glossary in Settings reveals Spanish multiplication terms with
  Russian explanations on demand. The separate `lang="es"` and `lang="ru"`
  attributes identify the content for assistive technologies.

## Changed files

| Area | Paths |
| --- | --- |
| Parent views and navigation | `src/app/{ModeShells.tsx,router.ts}`, `src/components/{layout/Navigation,ui/PageHeading}.tsx`, `src/features/parent/`, `src/features/multiplication/MultiplicationMap.tsx`, `src/features/statistics/{Achievements,History}.tsx`, `src/features/training/{Training,LearningSummary}.tsx`. Removed the old dashboard and combined results/analytics views. |
| Read model and analytics | `src/database/{parentReadModel,useParentRead}.ts`, `src/engine/learning/analytics.ts`. Removed the overlapping diagnostic, learning, and progress data hooks. |
| Presentation and settings | `src/app/{providers.tsx,useMetricFormat.ts}`, `src/main.tsx`, `src/styles/{themes,global,responsive,child,parent}.css`, `src/components/mascot/Mascot.tsx`, `src/features/settings/{Settings,ParentPinDialog,ParentPinSettings,BackupControls}.tsx`, `src/features/child/ChildPracticeResult.tsx`, `src/locales/{es,ru}.json`. |
| Verification | `tests/browser/{parentExperience,themeVisuals,diagnostics,foundation,learning,progressBackup}.spec.ts`, `tests/support/{contrast,parentMode}.ts`, `tests/setup.ts`, `tests/upgrade/previousRelease.spec.ts`. The upgrade test changes only candidate-side navigation. |

## Verification

- `npm run build` passed with type checking and distribution validation.
  Worker revision `b4a984be28aa5d651274` precached nine app assets under
  `/MathHero/`. `npm run lint`, `git diff --check`, and all 61 unit tests passed.
- The full `npm run test:e2e -- --reporter=list --output=test-results/stage4-browser`
  passed 210 checks in 8.9 minutes on Chromium and WebKit at phone and tablet
  portrait and landscape sizes. The six duplicate full-diagnosis instances
  were intentionally skipped. Both portrait engines went through all 144
  directions. Coverage includes child automatic advance and manual correction,
  the live two-tab ownership race, the 844 × 390 exercise fit and touch targets,
  mode gating and resumption, parent destinations, backup dialogs, live theme
  changes, and rendered contrast in both locales. This run used worker
  `1f743d73b00e930cdeb7`.
- The final presentation correction applies the shared control border to the
  child result return button, keeps the improvement count and noun together,
  and uses the shared locale formatter in the adult session summary. The
  affected browser rerun on `b4a984be28aa5d651274` passed 26 checks in
  3.8 minutes with six duplicate full-diagnosis skips. It reran both theme
  passes and the completed-practice result in all eight viewport projects.
  Both phone-portrait engines repeated the full diagnosis and captured the
  part break and the complete report in each theme.
- `npm run test:pwa` passed 10 checks in Chromium and WebKit. The checks
  exercised install and offline resume, waiting updates, failed update
  recovery, first-install recovery, and desktop startup sampling.
- `npm run test:upgrade` passed six checks in Chromium and WebKit. The
  tests used real IndexedDB and reproducible learning records generated
  through the pinned published build at
  `923d1f634047322e688eafb38679ad3dba66e1d7` with worker
  `7a73513eb82bcfc66d1d`. They covered an empty and populated upgrade,
  preservation of legacy records, backup import and re-export, preserved
  PIN verification, natural worker activation, and offline draft resume.
  The artifacts are under `test-results/upgrade/`.
- A static import scan found 63 TypeScript modules and 240 local edges with
  zero cycles and zero engine dependencies on React or persistence. The
  two locale catalogs each have 238 keys with matching interpolation fields.
- All three Playwright processes exited successfully. Ports 4173, 4174, and
  4175 had zero TCP listeners after the runs.

## Rendered evidence

Browser computed styles supplied 844 contrast readings across the eight
projects and two themes, with 422 samples for each theme. The audit uses the
4.5:1 threshold for normal text and 3:1 for large equation operators and
meaningful control boundaries and graphics.
[W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

| Measured sample | Light | Dark |
| --- | ---: | ---: |
| Lowest normal text ratio | 6.29:1 | 7.30:1 |
| Lowest large text, control, or graphic ratio | 4.13:1 | 5.42:1 |
| Link on the overview's tinted panel | 6.60:1 | 8.19:1 |
| Invalid PIN message | 8.70:1 | 9.45:1 |
| Focused answer ring against the panel | 6.04:1 | 10.22:1 |
| Child result return button and select borders | 4.78:1 | 5.79:1 |
| Progress fill token against the rendered track | 5.51:1 | 5.86:1 |

The normal text minima are the muted home copy in light and the current
parent destination in dark. Both control minima are the progress track
boundary. The JSON reports include the foreground, background, ratio and
applicable threshold for each tested sample. They also cover the keypad,
correct and incorrect feedback, toggle track and thumb, and each status
symbol. Decorative surfaces and inactive controls are outside the sample
set.

Inspected actual browser captures at phone and tablet sizes in both themes.
The final local output contains 246 themed screenshots in the
`themeVisuals-*` directories and eight more diagnosis screenshots under
`diagnostics-*`, all under `test-results/stage4-final-review/`.
`test-results/stage4-final-contact-sheets/` contains 24 review sheets.
The table lists original files relative to the final review output.

| View | File |
| --- | --- |
| Spanish child keypad, dark phone portrait | `themeVisuals-rendered-dark-4ef1b-oss-child-and-adult-screens-chromium-phone-portrait/dark-child-exercise.png` |
| Spanish overview, light tablet landscape | `themeVisuals-rendered-ligh-760c3-oss-child-and-adult-screens-chromium-tablet-landscape/light-parent-overview.png` |
| Russian map and selected fact, dark tablet portrait | `themeVisuals-rendered-dark-4ef1b-oss-child-and-adult-screens-webkit-tablet-portrait/dark-parent-map.png` |
| Russian PIN error and visible reset, dark phone landscape | `themeVisuals-rendered-dark-4ef1b-oss-child-and-adult-screens-webkit-phone-landscape/dark-pin-error.png` |
| Russian completed child practice with the improved pair count together | `learning-completes-a-real--48925-and-shows-localized-results-webkit-phone-portrait/daily-summary-ru.png` |
| Complete diagnosis, dark phone portrait | `diagnostics-finishes-all-s-32799-ows-real-diagnostic-results-webkit-phone-portrait/dark-parent-diagnosis-complete.png` |

These commands regenerate the final review output.

```powershell
npm run build
npm run test:e2e -- themeVisuals.spec.ts learning.spec.ts diagnostics.spec.ts --grep 'rendered .* theme|completes a real daily session|finishes all six parts' --reporter=list --output=test-results/stage4-final-review
```

## Remaining release acceptance

- Stage 5 owns explicit learned, fluent and retained evidence, error
  hypotheses, interventions and scheduler improvements.
- Stage 6 owns the published screenshot set, final guides, release acceptance
  and Pages deployment. This stage uses Windows desktop browsers with
  emulated phone/tablet viewports. Physical iPhone and iPad checks remain
  open, including Safari installation and backgrounding, native keyboard,
  native file dialogs, and the installed app's system appearance.


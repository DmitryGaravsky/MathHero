# MathHero 1.1 stage 3 — child experience

Status — historical 1.1 stage record. See the
[active 1.1 child guide](../../user/CHILD_GUIDE.md).

Working branch `v1.1/03-child`. Handoff for coordinator review.

## Child flow

- Child Home offers one primary practice link, a progress bar for the 78
  canonical multiplication pairs, and a link to achievements. The practice
  link opens the start or resume control, so a new or saved question is two
  actions away. Opening the practice route after completion preserves the
  result and offers a new session. ES/RU switching and the adult PIN entry stay
  available in the shell. Legacy child weak-practice routes still resume their
  canonical targets. Analytics, diagnosis, history, the map and settings remain
  in the parent shell.
- Shared practice displays the same engine-selected facts and retains physical
  input, the built-in keypad and the device keyboard option. The child exercise
  shows a question count, a large equation and pause, finish and save-and-exit
  controls. The child result uses the stored answer and improved-pair counts
  and the session reward ledger. An empty session explicitly says no question
  was answered. The badge page uses the same achievement IDs and actual awarded
  events as the parent achievement list. Its copy explains why reversing the
  factors counts separately for table badges.
- Correct feedback stays visible for 800 ms before advancing in daily and weak
  practice and parent diagnosis. The correct cue is the same for slow and fast
  correct answers. The visible Next or View Summary action can also be used
  immediately. A diagnosis part ends at its existing deliberate break. Wrong
  feedback always waits for a deliberate action. The optional child correction
  lets the child copy the shown product before continuing. This rehearsal lives
  in the mounted exercise, while the original attempt, repeat queue and
  rewards continue to follow the existing engine rules.

## Timing and persistence

- `useDiagnostic` arms the timer after the feedback DOM commits. It passes the
  exact rendered `Session` object to `canAdvanceAutomatically` and
  `advanceCorrectFeedback`. Effect cleanup follows snapshot and activity
  changes. Lifecycle events suspend the controller and its transactions. The
  timer also checks the current hash, page availability and document visibility
  at dispatch. An IndexedDB live query on the one session ID invalidates the
  timer if another view moves its position or changes ownership. Repository
  ownership and position checks remain the transactional guard.
- A visible, uncovered view can schedule a fresh delay after it reloads its own
  saved correct feedback. A fresh mount or reload presents feedback owned by
  the old view for manual continuation. The automatic path never calls claim.
  Question timing starts only once a new question is shown and stops during
  answer feedback, cover, page suspension, explicit pause and detach.
- Child Home reads the bounded pair-progress table and the first unfinished
  adaptive session using the mode index. Child Achievements reads the
  achievement reward kind. Child and parent learning summaries query rewards
  by session ID. The schema and backup formats are the stage 2 versions. The
  adaptive scheduler, diagnosis and reward engine keep their existing policy.

## Changed files

| Files | Change |
| --- | --- |
| `src/app/ModeShells.tsx`, `src/features/child/ChildHome.tsx`, `ChildAchievements.tsx`, `ChildPracticeResult.tsx` | Child entry, progress, achievements and results. |
| `src/features/training/Training.tsx`, `PracticeQuestion.tsx`, `LearningSummary.tsx`, `useDiagnostic.ts` | Shared lifecycle, input, feedback and summary views. |
| `src/database/usePracticeData.ts` | Indexed child and session reads and owned-feedback observation. |
| `src/components/ui/Icon.tsx`, `src/locales/es.json`, `src/locales/ru.json`, `src/main.tsx`, `src/styles/child.css`, `src/styles/global.css` | Bilingual labels, badge icons, focus and responsive styling. |
| `tests/browser/childExperience.spec.ts`, `diagnostics.spec.ts`, `foundation.spec.ts`, `learning.spec.ts`, `progressBackup.spec.ts`, `tests/diagnostics.test.ts`, `tests/foundation.test.tsx` | Entry, timing, races, learning results, device-layout and baseline regression assertions. |

## Verification

- `npm run build` succeeded, including `npm run typecheck`, the production build,
  the nine-asset service-worker precache and the distribution allowlist. The
  worker revision for the initial full run was `9211320aed89806520bb`.
- `npm run lint` passed. `npm test` passed 61 tests. The added controller test
  suspends an automatic advance inside the IndexedDB transaction and verifies
  that the same committed feedback can subsequently advance once.
- `npm run test:e2e -- --reporter=list --output=test-results/browser-final`
  passed 178 checks in 5.1 minutes. The six existing redundant full-diagnosis
  skips remain. Chromium and WebKit covered phone and tablet portrait and
  landscape, including the two-action entry, draft resume, slow correct
  answers, deliberate correction, PIN and visibility suspension, a live
  two-tab ownership race, and reload. The 24-answer flow verifies that the
  final correct answer reaches the summary automatically with exactly one
  completion event. A manual early finish after zero answers shows the
  empty result. Both portrait browsers completed all 144 diagnosis questions.
- `npm run test:pwa` passed 10 checks. Coverage includes offline practice,
  new-window draft resume, waiting updates, install failure and recovery.
- `npm run test:upgrade` passed 6 checks against published commit
  `923d1f634047322e688eafb38679ad3dba66e1d7` and its worker `7a73513eb82bcfc66d1d`.
  The suite used its existing synthetic history to verify the additive native
  upgrade, original draft and feedback, backup v1 import and v2 export, local
  PIN preservation, and natural worker replacement with offline resume.
- Inspected browser captures of the child home, portrait and landscape
  exercises, correction, Russian results, and Russian achievements.
- `git diff --check` passed. The owned test servers stopped and ports 4173,
  4174 and 4175 had no listeners after verification.

### Landscape review correction

Moved the exercise column up and tightened the equation line in the short
landscape layout. The regression checks the equation, focused answer field
including its outline, and full keypad at scroll position zero in the
844 × 390 viewport, with at least 12 CSS px at the bottom. It checks keypad
touch targets of at least 44 × 44 CSS px. Pause and finish are reachable by
scrolling.

- `npm run build` and `npm run lint` passed after the CSS change. The final
  worker revision is `eafd52595666b5eb7608`.
- `npm run test:e2e -- childExperience.spec.ts learning.spec.ts --project chromium-phone-landscape --project webkit-phone-landscape --reporter=list --output=test-results/browser-landscape-review`
  passed all 18 targeted checks in 31.3 seconds. Inspected the updated
  `child-exercise-viewport.png` captures from both browsers in that folder.

## Remaining acceptance

- Stage 4 owns theme coverage and parent information architecture. Stage 5 owns
  learning-policy and analytics refinements. This child progress bar reflects
  the current engine's confirmed mastery evidence.
- This stage uses Windows Chromium and WebKit mobile viewport projects and
  synthetic visibility events for lifecycle checks. The coordinator and user
  still need final release review and physical iPhone and iPad acceptance,
  including the native keyboard, Safari backgrounding and installation.

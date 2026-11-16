# MathHero 1.1 stage 5 — learning evidence

Working branch `v1.1/05-pedagogy`. Handoff for coordinator review.

## Parent evidence

The overview counts the 78 canonical multiplication pairs. Counts are nested.
The map and Weak Spots drilldown show the strongest currently supported state
for the selected pair. The two orientations share pair evidence and keep
their separate answer histories. A square has one orientation.

| State | Pilot evidence required |
| --- | --- |
| Learned | At least two correct practice answers, at least 80% recent accuracy, and a correct latest answer in each orientation. |
| Fluent | Learned evidence, at least 90% recent accuracy, and at least three fast correct answers across at least two practice sessions. At least 80% of correct answers must be fast, including the latest answer in each orientation. |
| Retained | Fluent evidence and current mastery, plus a confirmed retrieval after a scheduled interval. The pair must be mastered before and after the check. The fast correct answer must arrive at or after the due time and at least the full interval after the last recorded practice attempt for the pair. It must be in a different session and on a different calendar day from the interval-setting answer and last retrieval. Historical time-zone day keys apply, and the previous and current timestamps must also be on different dates in the checking session's zone. |

These are application pilot thresholds. The recent knowledge window is the
existing 20 practice attempts. Sparse or inconsistent evidence leaves the pair
unconfirmed. Fast means at most
`fastMs` in the recorded session policy, currently 3,000 ms. Diagnosis supplies
baseline observations and map color. The map's blue direction status requires
repeated fast correct practice in that direction. Its green star still
represents established mastery. Both direction statuses are distinct from the
pair state in the drilldown. The child continues to see the same confirmation
for a correct answer at any speed.

Early practice preserves the due date. A correct response performed after
the due time but shortly after a rehearsal can advance the spaced schedule
under the existing interval rules without creating retention evidence. The
parent detail gives the date in the qualifying session's recorded zone and
the verified interval. A wrong or slow response or loss of mastery clears the
current retention proof. A wrong response makes the pair due immediately. A slow
correct response caps its interval at one day and can move its review earlier.
Fast early practice can preserve an existing proof.

## Weakness observations and actions

- A canonical weak row shows the separate counts of incorrect and correct-slow
  answers in up to ten recent practice observations. When the pair has only
  been assessed in diagnosis, the row identifies the baseline source.
  Rows with recurring errors come first, followed by number of wrong and slow
  answers. The list offers general weak practice and canonical pair links.
- Recurring errors require at least two wrong answers across different sessions
  and dates. One miss or multiple misses on a single day remain observations.
- Instability after confirmed mastery requires at least two setbacks across
  different sessions and dates in the recent observation window. A setback is
  a wrong or correct-slow practice answer. Exact journal replay detects
  historical mastery even after the current mastery marker clears, and
  restarts the setback history after renewed mastery or verified delayed recall.
- A possible input slip requires one wrong answer with the two product digits
  reversed, plus fast right answers immediately before and after it in the
  same orientation across three different sessions and dates. The hypothesis
  leaves the recorded error, accuracy, repeat scheduling, and reward ledger
  intact. Limited evidence is identified explicitly.
- Pair details use the canonical IndexedDB index and journal sequence. They
  read historical policy snapshots to recover the date and speed applicable
  to each observation. Different sessions can have equal or decreasing
  wall-clock timestamps without reordering the evidence.

## Selection, persistence, and compatibility

- Fresh policy v2 ordinary adaptive sessions reserve the first of 24 slots for
  the oldest due mastered pair, if available. This prevents errors and familiar
  fillers from crowding out every due check. The remaining slots follow the
  existing warm-up, weighted selection, repeat gaps and quotas, optional
  mastery cap, table diversity, and least-exposed orientation rules. General
  and targeted weak sessions keep their existing selection rules. A due backlog
  can span multiple sessions.
- Mastery still follows the published policy. In the recent 20 practice
  attempts it requires five successes, three calendar days, two sessions,
  95% accuracy, a median of at most 3,000 ms over the latest 15 correct answers,
  a fast correct answer and a latest correct answer in each orientation, and
  no wrong answer in either the last five attempts or the past seven elapsed
  days. A qualifying practice answer confirms mastery. Review intervals remain
  1/3/7/14/30 elapsed days. Reward thresholds and deduplication and saved
  question and feedback semantics follow the published policy. A due-cycle
  reward can be earned under the existing ledger rules even when the new
  parent proof requires a longer gap.
- Session schema 2, IndexedDB schema 4 and the v2 backup envelope remain in use.
  Backup validation checks the exact registered v1 or v2 policy fields with the
  saved IANA zone. Published backup v1 accepts published policy v1. A v2 backup
  can contain both session policies. Users upgrading to 1.1 can restore either
  prior format. The published build predates policy v2.
- A progress row may now contain the optional replay-verifiable retention
  proof, or an explicit null after its invalidation. An upgraded installation
  retains its legacy rows. When a current mastered legacy row has a retention
  reward and no stored proof, the overview replays only that pair with its
  historical session policies. Subsequent qualifying checks or setbacks record
  a bounded proof state in the normal answer transaction. Drilldown replays
  actual answers on demand. Neither database migrations nor backup import rewrite
  old session policies. Existing rewards and old-only replay keep their
  published values.

## Changed files

| Area | Paths |
| --- | --- |
| Engine | `src/engine/learning/{knowledge,progress,scheduler,analytics}.ts` |
| Data reads and backup validation | `src/database/{parentReadModel,backup}.ts` |
| Parent screens | `src/features/parent/{ParentSummary,ParentWeakSpots,PairEvidence}.tsx`, `src/features/multiplication/MultiplicationMap.tsx` |
| Presentation | `src/locales/{es,ru}.json`, `src/styles/{global,parent}.css` |
| Verification | `tests/{knowledge,progressBackup}.test.ts`, `tests/browser/{pairEvidence,parentExperience,themeVisuals}.spec.ts`, `tests/upgrade/previousRelease.spec.ts` |

## Verification

- `npm run build` passed type checking, Vite production build, and distribution
  validation. Worker revision `01ee92a8204ef083b478` precached nine allowed app
  assets scoped to `/MathHero/`. Lint and `git diff --check` passed.
- `npm test` passed 68 tests. New cases cover slower accurate learners, fast
  learners, 17 recent errors followed by three fast answers, rare fast answers
  among consistently slow responses, orientation evidence, historical zones,
  backward clock movement, shortly spaced retrieval across midnight, and the
  same-session limit. They also exercise two genuine 14/30-day retrievals in
  ordinary 24-question sessions with competing errors and check the canonical
  gaps, quota and both orientations. The mixed-policy round trip resumes a v1
  draft after a v2 retention check at the same timestamp and rejects unknown or
  altered policies and forged retention proof.
- The existing 90-day pilot replay used seed 42 and 24 questions per day. All
  three profiles reached 78 pairs and 144 directions. The fast accurate profile
  mastered 78 pairs with a longest interval of 30 days. The slow accurate
  profile had zero wrong answers and zero mastered pairs. The fast profile
  with three persistent gaps recorded 976 misses in those gaps and mastered
  the other 75 pairs. These are synthetic trajectories.
- `npm run test:e2e -- --reporter=list --output=test-results/stage5-browser`
  passed 218 checks in 9.1 minutes across the eight Chromium and WebKit
  phone and tablet projects. The existing six duplicate full-diagnosis tests
  were skipped. Both phone portrait engines completed all 144 diagnostic
  directions. The eight new populated parent-evidence scenarios passed.
- `npm run test:pwa` passed 10 tests in 40.9 seconds in Chromium and WebKit.
  Coverage includes scoped install, offline learning and new-window resume,
  waiting updates, failed update and first-install recovery, and local desktop
  startup samples.
- `npm run test:upgrade` passed six tests in 52.2 seconds in Chromium and
  WebKit. Both reproduced the pinned published release
  `923d1f634047322e688eafb38679ad3dba66e1d7` and worker `7a73513eb82bcfc66d1d`.
  The populated upgrade compared exact old IndexedDB stores before candidate
  actions, compared v1 business records on re-export and import, preserved
  draft, feedback and the local PIN, and reconstructed a 14-day Retained check
  for `9 × 9` in the overview and pair detail. The other checks verified an
  empty upgrade and natural worker activation with offline resume. An initial
  run used a touch-only tap in a desktop test context for the new map
  assertion. Switching the assertion to a click resolved that harness issue.
  The final full upgrade rerun used the same application build.
- The three final Playwright runs exited successfully. Ports 4173, 4174, and
  4175 had zero fixture listeners afterward.

## Rendered evidence

Inspected the new overview, retained-pair detail and expanded weakness
evidence using screenshots from `test-results/stage5-browser/`. The twelve
populated screenshots are in the directories beginning
`pairEvidence-shows-cumulat-39d0b-actice-in-both-orientations-`.

| Project suffix | Captures |
| --- | --- |
| `chromium-phone-portrait` | `es-light-{overview,retained,weakness}.png` |
| `chromium-phone-landscape` | `es-dark-{overview,retained,weakness}.png` |
| `webkit-phone-portrait` | `ru-light-{overview,retained,weakness}.png` |
| `webkit-phone-landscape` | `ru-dark-{overview,retained,weakness}.png` |

The same scenario verifies all three counts, a localized 14-day proof, the
same targeted action from both orientations of a pair, two corroborated
weakness patterns, and the opening exercise of targeted practice. The
two locale catalogs contain 259 matching keys and interpolation fields.

The contrast checks recorded 956 browser-computed samples, with 478 per
theme. The 112 new readings cover the overview label, count and explanation,
the pair detail state and recorded incorrect count, and the weak row and
drilldown counts. The JSON reports are under the `themeVisuals-*` output
directories. The thresholds are 4.5:1 for normal text and 3:1 for the sampled
large text and meaningful control and graphic boundaries.

| Minimum among measured samples | Light | Dark |
| --- | ---: | ---: |
| New knowledge and weak-evidence text | 7.28:1 | 8.14:1 |
| All normal text samples | 6.29:1 | 7.30:1 |
| Large text, control, and graphic samples | 4.13:1 | 5.42:1 |

## Remaining release acceptance

Coordinator review and stage PR CI remain open. The pilot thresholds and
bounded evidence windows describe observed answers and need observation during
actual use. The stage browser matrix uses desktop Chromium and Playwright
WebKit with emulated phone and tablet sizes. Physical iPhone and iPad acceptance
remains open.

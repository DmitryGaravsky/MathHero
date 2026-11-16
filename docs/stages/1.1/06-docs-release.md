# MathHero 1.1 stage 6 — documentation and release verification

Status — stage handoff for coordinator review. Working branch
`v1.1/06-docs-release` from the accepted stage 5 merge `0a2bcfd`.
The [release delivery record](../../DELIVERY-1.1.md) tracks publication.

## Changed files

| Area | Paths and changes |
| --- | --- |
| Entry points | `README.md` and `docs/README.md` introduce the app, link the live Pages URL, and index the current and historical references. |
| Product and user documentation | `docs/product/{OVERVIEW,POSITIONING,FEATURES,ROADMAP}.md` and `docs/user/{CHILD_GUIDE,PARENT_GUIDE,SETTINGS,DATA_AND_BACKUP}.md` document implemented scope, use and limits. |
| Learning and architecture | `docs/pedagogy/{LEARNING_MODEL,MASTERY_POLICY,ADAPTIVE_TRAINING,DIAGNOSTICS}.md`, `docs/architecture/{OVERVIEW,APPLICATION_STRUCTURE,DATA_MODEL,ENGINE,STORAGE}.md` and `docs/architecture/DECISIONS/README.md` document 1.1 behavior, dependencies and compatibility. |
| Developer and device instructions | `docs/development/{SETUP,TESTING,CODE_STYLE,RELEASE,CONTRIBUTING}.md` and `docs/DEVICE-ACCEPTANCE.md` cover setup, checks, build, release and pending hardware acceptance. |
| History | Added status and replacement references to `docs/specification.txt` and the five MVP and five prior 1.1 handoffs. Historical outcomes, examples and algorithms are preserved. |
| Release metadata | Updated `package.json` and root metadata in `package-lock.json` to **1.1.0**. Existing dependency versions and workflow inputs are identical to stage 5. |
| Images | Four production app captures under `docs/assets/`, linked below. |

## Executed verification

Local Windows, Node 24.22.1 and npm 11.19.1.

| Command | Result |
| --- | --- |
| `npm ci` | Clean candidate install passed with 231 packages installed. |
| `npm run build` | Passed type check, Vite build, precache generation and the distribution allowlist. Worker revision `01ee92a8204ef083b478`, nine precached app assets scoped to `/MathHero/`. Revision matches stage 5. The docs, screenshot PNGs and attachment are outside the distribution. |
| `npm run lint` | Passed. |
| `npm test` | 68 passed in 7 files. |
| `npm run test:e2e -- --reporter=list --output=test-results/stage6-browser` | 218 passed across eight Chromium and WebKit projects in 9.7 minutes. Six existing duplicate full-diagnosis checks skipped. Both phone portrait projects completed the full 144-direction diagnosis. |
| `npm run test:pwa -- --reporter=list` | 10 passed in 47.3 seconds, including scoped install, offline resume, waiting updates, recovery and loopback timing. Observed cold launch 209–470 ms and warm offline 81–346 ms in desktop contexts. |
| `npm run test:upgrade -- --reporter=list` | 6 passed in 56.1 seconds of Playwright execution. The harness archived published commit `923d1f634047322e688eafb38679ad3dba66e1d7`, installed its original lockfile in isolation, and rebuilt its published worker `7a73513eb82bcfc66d1d`. Both engines preserved empty/populated native stores and saved draft/feedback, accepted the v1 export, and exercised natural worker activation with offline resume. |
| `git diff --check` | Passed. |

The browser contrast checks produced 956 readings. Among the sampled normal
text, minima were 6.29:1 in light and 7.30:1 in dark. Sampled large text,
control and graphic boundaries reached minima of 4.13:1 and 5.42:1 respectively.
All four preview and fixture ports (4173–4176) were clear after the runs.

## Documentation and boundary audits

- Reviewed the English prose and source comments. A Cyrillic scan covered 42
  Markdown/text records and 64 comment ranges in 106 source, test, script,
  style, markup and workflow files. Spanish glossary terms and localized UI
  strings remain in their intended contexts.
- Verified 122 local documentation link and image references, including exact
  path case and linked heading anchors. Matched all 259 locale keys and their
  interpolation fields between ES and RU.
- Inspected 65 TypeScript/TSX source modules and 265 relative imports.
  The graph including type-only imports is acyclic. The engine has no imports
  from React, the UI, storage or external packages.
- Compared both package JSON files to stage 5 after normalizing the root
  version values. The version is the only metadata difference.

## Screenshot provenance

The capture run passed three Playwright checks using the built preview in
fresh Chromium contexts at 2× pixel density. The parent views imported the
engine-generated synthetic v2 JSON from the
[pair evidence fixture](../../../tests/browser/pairEvidence.spec.ts) through
Settings, then asserted actual counts or retention before capture. Child
screens use clean, isolated browser contexts. No personal data was used.

| File | Captured screen |
| --- | --- |
| [Child home](../../assets/child-home-light.png) | Light, Spanish. Home and primary practice action in a 390 × 920 CSS px viewport. |
| [Child practice](../../assets/child-practice-dark.png) | Dark, Spanish. First exercise and accessible keypad in a 390 × 920 CSS px viewport. |
| [Parent overview](../../assets/parent-overview-light.png) | Light, Russian. Full page from a 1180 × 900 CSS px viewport. The actual counters show 3 Learned, 2 Fluent and 1 Retained pair. |
| [Parent map](../../assets/parent-map-dark.png) | Dark, Spanish. Full page from the same tablet viewport. The selected 9 × 9 detail shows its 14-day check. |

Visually reviewed the four PNGs for framing, readable controls, locale and theme.

## Limits and outstanding acceptance

The new language, theme, mode, offline and backup instructions describe the
tested implementation. Pedagogical thresholds remain pilot parameters. The
desktop browser and timing tests use browser viewports and local fixtures.
Real Safari and Home Screen behavior and startup on iPhone and iPad remain
pending in the [device checklist](../../DEVICE-ACCEPTANCE.md).

Coordinator review, stage PR and CI, final integration, Pages publication and
live HTTPS smoke checks remain open for this stage.

# MathHero 1.1 requirements

Status — active release specification. English counterpart of the user's
“Technical specification MathHero 1.1” attachment. Read the subsequent user
decisions below together with the numbered specification.

## Release scope

The release completes and improves the existing multiplication-table trainer,
including its product experience, interface, learning model, repository
structure, and documentation. The scope is fixed.

- Child and parent modes.
- Light and dark themes.
- Simpler navigation.
- Improved practice and learning policy.
- Improved analytics and progress views.
- Refactoring of the existing architecture.
- Finished documentation and repository.

The scope excludes new mathematical modules, accounts, server infrastructure,
plugins, and a general-purpose extension platform.

## Subsequent user decisions that supersede the source

- Section 2.4. The default parent PIN is **1234**. The PIN confirms a local mode
  switch. Store hashed verification data and support changing and deliberately
  resetting the PIN without deleting progress or requiring a recovery code.
  Protecting access from the child and providing account authentication are
  outside the scope of this gate.
- Section 5.2. Correct answers advance automatically after brief visual feedback.
  Incorrect-answer explanations wait for a deliberate action by the child.
  Hidden or paused practice never advances, and feedback time never contributes
  to response time.
- Sections 7.5 and 9. Preserve existing data and backup compatibility. Verify
  upgrades using previous-version IndexedDB structures populated with synthetic
  answers, with no personal browser profile or child data.
- Sections 8, 10, and 12. All repository documentation and source-code comments
  must be English. Keep the product interface in ES/RU. The coordinator reviews
  six sequential Sol stage chats and their PRs on the release integration
  branch. Only the reviewed, complete release may reach main and GitHub Pages.
  Physical iPhone and iPad acceptance is separate from desktop browser emulation.

## 1. Project goals and principles

### 1.1. Positioning

MathHero is a personal, bilingual mathematics practice app for children. It
develops durable calculation skills and automatic recall. The current product
implements one complete module, the multiplication table.

The primary audience is a child learning mathematics in a Spanish-speaking
school and Russian-speaking parents supporting that learning. The interface
supports Spanish and Russian.

### 1.2. Product principles

- Prioritize a simple child interface over the number of features.
- Give parents detailed analytics and children clear feedback.
- Judge automatic recall by accuracy, speed, and durability.
- Make learning adaptive and predictable.
- Run locally without registration or a server dependency.
- Match the architecture to the actual scale of the project.
- Give product users and developers documentation suited to their distinct needs.

### 1.3. What is out of scope

The architecture must fit a small standalone application. This release excludes
a plugin system, dynamic module loading, a universal mathematical exercise
builder, microservices, user accounts, backend synchronization, multi-user
profiles, and abstractions for operations the product does not implement.

## 2. Child and parent modes

**Priority P0.** This is the main product change.

### 2.1. Shared requirements

Provide two clearly distinct modes, Child Mode for the child and Parent Mode
for the parent. They share learning data, settings, and session history.
Switching modes must create neither separate profiles nor copies of progress.

### 2.2. Child mode

Minimize the path from opening the app to starting practice. The following is
an illustrative layout with sample numbers. The greetings reproduce the Spanish
copy in the source example.

```text
Child interface
MathHero
¡Hola! 👋
¿Listo para entrenar?
Your progress
62 / 78
Facts mastered
Start practice →
My achievements 🏆
```

- Give the home screen one primary action that starts practice.
- Reach an exercise within two taps of opening the app.
- Show a practice selection screen only when the available practice types
  make it necessary.
- Keep technical settings, history, detailed analytics, and algorithm
  parameters outside the child interface.
- Make achievements visual and easy to understand.
- After practice, show a short result and offer to continue or finish.
- Preserve the ability to resume an unfinished session.
- Keep language switching and entry to parent mode accessible.

Required screens are home, practice selection when necessary, exercise,
practice result, and achievements.

### 2.3. Parent mode

**Priority P0.** Parent mode contains all learning management functions.

| Suggested section | Content |
| --- | --- |
| Overview | Current state of learning |
| Progress | Mastered and unmastered facts |
| Analytics | Accuracy, speed, and trends |
| Weak spots | Problematic pairs |
| Diagnostics | Initial assessment |
| History | Practice history |
| Settings | Language, theme, and preferences |
| Data | Export and restore |

Preserve all existing management functions. Keep analytics in parent mode.
Show the main indicators on the overview and reveal details on request.
Make the return to child mode obvious.

### 2.4. Mode switching

- Open in child mode at app launch.
- Provide a dedicated action to enter parent mode.
- Require the parent PIN for entry.
- Provide PIN setup and change. Follow the subsequent decision on default and reset.
- Store PIN verification data securely, without saving the PIN in plaintext.
- Return to child mode with one action.
- Keep an active practice session intact when switching.
- Restore the appropriate child screen when returning.

## 3. Light and dark themes

**Priority P1.** Provide a complete theme system.

### 3.1. Theme options

| Value | Behavior |
| --- | --- |
| System | Follow the device theme |
| Light | Force the light theme |
| Dark | Force the dark theme |

### 3.2. Implementation requirements

- Use one color token system. Use theme tokens wherever components need
  theme-dependent colors.
- Support both themes on every screen, including the on-screen keypad.
- Make inputs and error states easy to distinguish.
- Meet accessibility requirements for text contrast.
- Persist the chosen preference across launches.
- Reflect device theme changes automatically when set to System.
- Apply themes consistently in both modes, using the same components.

The source recommends the following stylesheet structure.

```text
src/
  styles/
    tokens.css
    themes.css
    global.css
```

## 4. Improve the multiplication learning model

**Priority P0.** Give this core functionality at least as much attention as
the redesign.

### 4.1. Preserve existing learning functionality

Retain initial diagnosis, daily practice, weak-spot practice, repetition of
missed facts, separate accuracy and speed measurements, spaced repetition,
mastery, achievements, and attempt history. Justify and test any learning
policy change. Code simplification alone does not justify algorithm changes.

### 4.2. Distinguish three knowledge states

| State | Meaning |
| --- | --- |
| Learned | The child answers the exercise correctly |
| Fluent | The child answers correctly and quickly |
| Retained | The child still demonstrates the skill when checked after time has passed |

Represent these states correctly within the existing progress model. Separate
database entities are optional.

### 4.3. Verify retention

- Preserve the existing review intervals and continue to use evidence from
  distinct calendar days.
- Require evidence beyond one session to recognize retention.
- Include previously mastered facts in subsequent practice and provide
  checks after long intervals.
- Return a fact to review when performance declines.
- Incorporate retention checks into ordinary sessions without increasing
  practice volume.

### 4.4. Diagnose errors

Keep the child interface simple while improving error analytics. Distinguish
an incorrect answer, a correct but slow answer, recurring errors, instability
in a previously mastered fact, and a possible accidental input error. Require
more than one attempt before drawing conclusions about the nature of an error.
Show problem facts clearly to parents.

### 4.5. Response speed

Keep the existing 3000 ms threshold configurable as a learning policy
parameter. Avoid an aggressive timer in child mode. Prioritize accuracy and
give no negative feedback solely because a correct response was slow.

## 5. Improve the practice interface

**Priority P0.**

### 5.1. Exercise screen

- Keep the exercise central and use large digits.
- Make answer entry easy with both a physical keyboard and an on-screen keypad.
- Minimize distractions and unnecessary transitions.
- Keep technical practice parameters optional in the exercise view.
- Show feedback immediately after submission.

### 5.2. Feedback

For a correct answer, provide visual confirmation, a smooth transition to the
next exercise, and restrained animation. For an incorrect answer, show a calm
message, let the child correct the error according to the current practice
flow, and return the fact to practice later. Avoid punishment and negative
wording. Apply the subsequent decisions on automatic and deliberate advance.

### 5.3. Finishing practice

The results screen should answer three questions. What went well? What
improved? What happens next? Show simple achievements to the child and more
detailed analytics to the parent.

## 6. Bilingual support

**Priority P1.**

### 6.1. Interface

Support Spanish by default and Russian as an alternative.

### 6.2. Localization quality

- Keep ordinary screens in the selected language.
- Translate every error message, achievement, and setting.
- Format numbers and time for the selected locale.
- Persist the selected language across launches.

### 6.3. Mathematical terminology

Provide an option to show Spanish mathematical terms with explanations in
Russian. The English column below gives the English meanings for this
specification. The feature itself uses Spanish and Russian.

| Spanish term | Meaning in English |
| --- | --- |
| Multiplicación | Multiplication |
| Factor | Factor |
| Producto | Product |
| Tabla de multiplicar | Multiplication table |

Use terminology in explanations or learning materials without complicating
basic practice.

## 7. Architecture and refactoring

**Priority P0.** Keep the existing architecture, resolve the problems
identified in the audit, and make the application maintainable within its scope.

### 7.1. Principles

- Keep the engine independent of UI and pedagogy separate from presentation.
- Separate persistence from business logic.
- Keep mathematical algorithms out of components.
- Centralize app settings.
- Add abstractions only for concrete uses.

### 7.2. Target structure

```text
src/
  app/
    App.tsx
    routing/
    providers/
  features/
    child/
      screens/
      components/
    parent/
      screens/
      components/
    multiplication/
      screens/
      components/
  components/
    common/
    forms/
    feedback/
    navigation/
  engine/
    core/
    multiplication/
    sessions/
    learning/
  database/
    repositories/
    migrations/
    backup/
  locales/
    es/
    ru/
  styles/
    tokens.css
    themes.css
```

Use the structure as a guide. Move existing files when that improves the
boundaries.

### 7.3. Contracts to preserve

- Pure mathematical engine functions.
- Injected clocks and random sources.
- Atomic transactions.
- Separate diagnostic and ordinary practice flows.
- Historical attempt records.
- Existing session recovery.
- Local storage.
- Existing backup mechanism.

### 7.4. Audit questions

- Is business logic duplicated in the UI?
- Do components have too many responsibilities?
- Are there circular dependencies?
- Do components access IndexedDB directly, bypassing repositories?
- Are settings duplicated?
- Does learning policy depend on React?
- Do all progress changes use a consistent persistence mechanism?

### 7.5. Data compatibility

Preserve existing attempts, progress, history, achievements, settings, and
unfinished sessions. If the data model changes, implement a migration and
verify it against copies of real previous-version databases, following the
subsequent decision about synthetic data.

## 8. Documentation and repository quality

**Priority P0.** Treat documentation and repository quality as core release
work. Keep product information, user guides, architectural decisions, and
developer instructions distinct.

### 8.1. Proposed documentation structure

```text
README.md
docs/
  product/
    OVERVIEW.md
    POSITIONING.md
    FEATURES.md
    ROADMAP.md
  user/
    CHILD_GUIDE.md
    PARENT_GUIDE.md
    SETTINGS.md
    DATA_AND_BACKUP.md
  pedagogy/
    LEARNING_MODEL.md
    MASTERY_POLICY.md
    ADAPTIVE_TRAINING.md
    DIAGNOSTICS.md
  architecture/
    OVERVIEW.md
    APPLICATION_STRUCTURE.md
    DATA_MODEL.md
    ENGINE.md
    STORAGE.md
    DECISIONS/
  development/
    SETUP.md
    TESTING.md
    CODE_STYLE.md
    RELEASE.md
    CONTRIBUTING.md
  stages/
    ...
```

Review existing stage records before discarding anything. Identify active
specifications, development history, and obsolete drafts.

### 8.2. README requirements

Keep the README short. Explain what MathHero is, whom it serves, which problem
it addresses, what is implemented, how it looks, how to run it, and where to
find the architecture documentation.

The source suggests this outline.

```markdown
# MathHero
Short description
## Purpose
## Who is it for?
## Features
## Screenshots
## Live Demo
## Technology Stack
## Quick Start
## Documentation
## Privacy
## License
```

Include screenshots of both modes and light and dark themes, a live app link,
a clear description of local storage, and project status.

### 8.3. Product documentation

| Document | Content |
| --- | --- |
| `OVERVIEW.md` | The product and its purpose |
| `POSITIONING.md` | Audience, problem, value, and how it differs from conventional math trainers |
| `FEATURES.md` | Implemented functionality only |
| `ROADMAP.md` | Current plans and limits |

Keep planned and implemented capabilities distinguishable.

### 8.4. Architecture documentation

`architecture/OVERVIEW.md` explains the major components, data flows,
dependencies, responsibilities, storage, and learning mechanism.
`DATA_MODEL.md` describes entities and relationships. `ENGINE.md` describes
the mathematical logic and algorithms. `DECISIONS/` records significant
architectural choices, their rationale, and consequences.

### 8.5. Document status

Give each document a clear status as an active specification, instruction,
historical record, or obsolete document. When historical and current documents
describe different versions of an algorithm, identify the authoritative one.

## 9. Testing and quality control

**Priority P0.** Preserve all existing checks and extend them as follows.

| Area | Checks |
| --- | --- |
| Child mode | Navigation, starting and finishing practice |
| Parent mode | Access, analytics, and settings |
| Mode switching | Session state survives |
| PIN | Verification and storage |
| Dark theme | Every screen and state |
| Localization | Complete ES/RU coverage |
| Learning | Mastery, review intervals, and return of missed facts |
| Database | Migration and atomicity |
| Sessions | Recovery after restart |
| Backup | Export and import |
| PWA | Installation, offline operation, and updates |

Test on real devices or, at a minimum under the source requirement, in Safari
and Chromium at mobile resolutions. Pay particular attention to iPhone, iPad,
small screens, on-screen and physical keyboards, and rotation. Report
Playwright WebKit emulation and physical-device results separately.

## 10. Implementation stages

| Stage | Work | Result |
| --- | --- | --- |
| 1. Audit | Inventory screens, components, and documentation. Inspect current algorithms and technical debt. Establish the test baseline. | Change plan |
| 2. Architecture preparation | Central settings, `AppMode`, `ThemePreference`, separate UI shells, and PIN-gated parent entry. | UX foundation |
| 3. Child interface | New home, shorter navigation, simpler screens, improved feedback and achievements. | Complete child flow |
| 4. Parent interface and themes | Parent dashboard, analytics, settings, light and dark themes, and mode switching. | Complete user experience |
| 5. Learning model | Clarify mastery, verify retention, diagnose errors, improve weak-spot analytics, and verify the practice algorithm. | Complete multiplication module |
| 6. Documentation and release | Restructure documentation, update README, run full regression, verify migrations, and prepare release. | MathHero 1.1 |

## 11. MathHero 1.1 acceptance criteria

All mandatory requirements must be met. The source shows an interactive
acceptance checklist, initially **0/19**, with a **Reset check marks** control.
Its marks persist only in the current view. The checklist is release evidence,
outside the app's feature scope.

1. [ ] Child mode opens by default.
2. [ ] A child starts practice within two taps.
3. [ ] Child navigation excludes parent analytics.
4. [ ] Parent mode contains all existing management functions.
5. [ ] A PIN gates entry to parent mode.
6. [ ] One action returns to child mode.
7. [ ] Switching modes preserves the session state.
8. [ ] System, Light, and Dark themes work.
9. [ ] Both themes work correctly on every screen.
10. [ ] Spanish and Russian localizations are complete.
11. [ ] The existing multiplication algorithm works without regressions.
12. [ ] Diagnosis, review intervals, and mastery are preserved.
13. [ ] History and achievements are preserved.
14. [ ] Existing data migrates successfully.
15. [ ] Backup and restore work.
16. [ ] Automated tests pass.
17. [ ] The README and documentation reflect the product.
18. [ ] Obsolete documentation is identified and marked.
19. [ ] Architectural dependencies are documented.

## 12. Developer constraints

- Keep the release focused on the multiplication module.
- Require a demonstrated need before rewriting the working engine.
- Exclude backend infrastructure, accounts, plugins, and network synchronization.
- Build only the abstractions required by the implemented product.
- Obtain agreement before removing existing functionality.
- Preserve data compatibility.
- Preserve distinct child and parent experiences.
- Deliver pedagogical improvements as learning behavior.
- Record test success only after actually running the checks.
- Keep documentation aligned with the code.

The source recommends treating this specification as one assignment delivered
through separate stage PRs. Each PR should have a specific goal, a list of
changed areas, tests, updated documentation, and a migration description if
applicable. Keep unrelated refactoring out of each PR. Audit and document the
existing behavior before changing the UI or architecture.

The intended result is a finished multiplication-table trainer with a sound
learning model, a simple child interface, full parent tools, two visual themes,
and a professional repository. The app should be sustainable for long-term use
at its current scale.

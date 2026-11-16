# Math Hero

Status: active engineering and coordination instructions.

## Current release: MathHero 1.1

Read `docs/DELIVERY-1.1.md` alongside the historical MVP delivery record.
MathHero 1.1 was delivered through six sequential Sol stage chats, coordinator
review and stage PRs. It is now published on main and Pages. For future staged
releases, keep implementation on an integration branch until acceptance; only
a reviewed complete release may reach main and Pages. Follow the current user
request when deciding the scope and coordination of subsequent work.
The user's latest decisions supersede the feedback document: use a simple
default parent PIN of 1234 as a mode-switch confirmation, allow changing/resetting
it without deleting learning data, and do not build a recovery-code system.
Keep stored PIN verification data hashed; this local gate is not an account or
security boundary. Correct answers advance automatically after brief feedback;
incorrect-answer explanations wait for the child's action. Never advance a
hidden/paused practice or count feedback time as response time.
Preserve existing data and backup compatibility. Do not create further agents
or chats from stage chats. The coordinator owns Git/PR operations and delivery
records. All new documentation and comments must be English.

## Product and scope

Read `docs/specification.txt` and `docs/DELIVERY.md` before implementing a stage.
This is a React + TypeScript + Vite PWA for multiplication fluency, with RU/ES,
local IndexedDB storage, and GitHub Pages deployment. No backend or accounts.
The active 1.1 requirements are in `docs/product/REQUIREMENTS-1.1.md`; the
original specification preserves the MVP requirements. Explicit subsequent
user decisions take precedence. Record resolved ambiguities.
The user additionally requires ALL repository documentation and source-code
comments to be in English when work is complete. Write new documentation and
comments in English now; translate existing Russian docs in the final stage,
including the specification, stage reports, README and delivery log. Preserve
product UI localization in RU/ES; locale strings are not code comments.

## Stage coordination

The user requested one separate Codex chat per development stage and a
coordinating chat that reviews results and requests corrections. Run stages
sequentially in this shared checkout. Do not start a dependent stage before
the coordinator accepts its prerequisite. Do not spawn additional agents
unless explicitly asked. Do not create extra stage chats from a worker chat.
Each stage must leave a handoff with changed files, executed checks, results,
known limitations, and outstanding acceptance criteria in `docs/stages/`.
The coordinator records actual chat IDs and acceptance evidence in
`docs/DELIVERY-1.1.md`; `docs/DELIVERY.md` preserves the MVP delivery history.
Never represent planned, unexecuted, simulated, or device-only checks as passed.

## Engineering and verification

Keep the mathematical and adaptive engines independent of React. Inject clocks
and random sources where required for reproducible algorithm tests.
Cover all 144 directed facts and 78 canonical pairs. Keep speed and accuracy
separate. Mastery needs evidence across days, not a single session.
Background time must not count as response time. Persist resumable sessions.
Use transactional, versioned backups with validation before data replacement.
Keep every UI string localized. Default ES, sound off, animations on.
Offline caching is required for the completed MVP.
Use meaningful engine, persistence, and browser acceptance tests. Real iPhone
and iPad acceptance is distinct from automated WebKit/device emulation.
Verify dependency and GitHub Action compatibility when selecting versions;
commit a lockfile. Deploy only built dist assets to Pages, with the actual
case-sensitive repository base path. Do not publish the source attachment as
part of dist. Do not add child identifiers, telemetry, or cloud synchronization.

## Environment

Windows PowerShell; workspace `D:\GitHub\MathHero`. Node 24.22.1, npm 11.19.1,
Git 2.51.1 and authenticated GitHub CLI were verified during preparation.
The global npm registry points to an unavailable npmproxy. Use this project's
.npmrc; do not change global settings for other projects.
Sandbox networking fails DNS here. Approved escalated read-only probes to
registry.npmjs.org and api.github.com succeeded. A sandbox-only gh auth failure
does not establish expired credentials. Request normal tool escalation when
necessary; do not bypass policy or ask the user to disable safeguards.
The user authorized the public https://github.com/DmitryGaravsky/MathHero
repository, MIT licensing, and the complete development/deployment workflow.
Use GitHub Pages (base /MathHero/), not Sites hosting. The user has iPhone and
iPad and will perform real-device acceptance after implementation is complete.
Use the repository-local GitHub noreply identity for this personal project.
The user explicitly chose unsigned commits for MathHero; local commit.gpgsign
is false. Preserve other repositories' global signing settings.

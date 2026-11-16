# Testing

Status — verification instructions for the column arithmetic integration.

From the repository root, install dependencies and run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run browsers:install
npm run test:e2e
npm run test:pwa
npm run test:upgrade
```

On Linux CI, install Chromium and WebKit with their system dependencies by
running `npx playwright install --with-deps chromium webkit`. Stop standalone
preview processes when using the acceptance fixtures. The browser suite serves
the candidate build on port 4173. The PWA and native-upgrade fixtures use
4174 and 4175. Check ignored `test-results/` and `playwright-report/` for
local browser artifacts.

| Suite | Scope |
| --- | --- |
| Vitest | Fact catalog, column arithmetic, seed/clock-driven trajectories, mastery and retention, repositories, settings, v1/v2/v3 replay, backup and rollback |
| Browser | Chromium and WebKit, phone and tablet viewports in portrait and landscape, both locales, route and PIN guards, real input flows, resume, history and rendered contrast |
| PWA | Install, scoped caches, new offline window, updates with multiple clients, failed download recovery and desktop loopback startup samples |
| Native upgrade | Empty/populated IndexedDB generated in each published app, preserved drafts and feedback, legacy backup import, and natural worker update with offline resume from MVP |

The full baseline diagnosis runs once per engine. Six duplicate runs in other
viewport projects are deliberately skipped. The native harness archives and
builds both pinned commits under ignored `.playwright/`. It installs an archive's
original lockfile in isolation when it differs from the current one and verifies
the published worker revision before starting Playwright.

| Published build | Commit | Worker revision |
| --- | --- | --- |
| MVP | `923d1f634047322e688eafb38679ad3dba66e1d7` | `7a73513eb82bcfc66d1d` |
| 1.1 | `9309abde58cff9c001e7944f29d2b727965ee093` | `01ee92a8204ef083b478` |

Keep both pinned commits available in local Git history. The 1.1 suite captures
native v4 store metadata, rows and verifier bytes before switching the same
origin to the candidate. It compares all old stores immediately after upgrade
and checks that the six new stores are empty.

For real hardware, use the [iPhone and iPad checklist](../DEVICE-ACCEPTANCE.md).
Emulated viewports, browser contrast samples and desktop timings provide
separate evidence.

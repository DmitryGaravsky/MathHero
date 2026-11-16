# Testing

Status — active verification instructions for MathHero 1.1.

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
| Vitest | Fact catalog, seed/clock-driven trajectories, mastery and retention, repositories, settings, v1/v2 replay, backup and rollback |
| Browser | Chromium and WebKit, phone and tablet viewports in portrait and landscape, both locales, route and PIN guards, real input flows, resume, history and rendered contrast |
| PWA | Install, scoped caches, new offline window, updates with multiple clients, failed download recovery and desktop loopback startup samples |
| Native upgrade | Empty/populated IndexedDB generated in the published app, preserved drafts and feedback, legacy backup import, and natural worker update with offline resume |

The full baseline diagnosis runs once per engine. Six duplicate runs in other
viewport projects are deliberately skipped. The native harness archives pinned
commit `923d1f634047322e688eafb38679ad3dba66e1d7` under ignored `.playwright/`.
It uses that archive's own lockfile installation when the lockfile differs
from the current one, builds it and checks published worker revision
`7a73513eb82bcfc66d1d`. Keep the pinned commit available in local Git history.

For real hardware, use the [iPhone and iPad checklist](../DEVICE-ACCEPTANCE.md).
Emulated viewports, browser contrast samples and desktop timings provide
separate evidence.

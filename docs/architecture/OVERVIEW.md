# Architecture overview

Status — active architecture reference for MathHero 1.1.

MathHero is a React and TypeScript application built by Vite. It runs at a
static GitHub Pages URL, with hash navigation and an IndexedDB database
accessed through Dexie. A service worker caches the built app under
`/MathHero/`.

```text
Child and parent screens -> Practice controller -> Session repositories
Settings and parent views -> Preferences, backup and read repositories
                                      |
                                      +-> Pure math and learning engine
                                      +-> Dexie / IndexedDB
Build scripts -> Vite output, manifest, scoped service worker and validation
```

The app shell owns mode and route selection. The controller coordinates active
answer timing, visibility, feedback and persistence. Repositories provide
atomic writes and focused reads. The engine evaluates facts and computes
selection, progress and rewards from data supplied by callers. Components
format the resulting values in the selected locale. See
[application structure](APPLICATION_STRUCTURE.md), [data model](DATA_MODEL.md),
[engine](ENGINE.md), [storage](STORAGE.md) and [decisions](DECISIONS/README.md).

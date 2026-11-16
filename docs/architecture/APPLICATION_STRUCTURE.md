# Application structure

Status — active source map for MathHero 1.1.

| Directory | Responsibility |
| --- | --- |
| `src/app` | Hash routes, child and parent shells, shared preferences, theme resolution and localization |
| `src/features` | Child home and results, practice controller, parent destinations, multiplication map, settings and statistics |
| `src/components` | Shared navigation, input and keypad, heading, icons and fox artwork |
| `src/engine` | Exercise contracts, multiplication catalog, diagnosis, active timer, selection, mastery, evidence and rewards |
| `src/database` | Dexie schema, repositories, write transactions, backup validation and reactive read adapters |
| `src/settings` | Preference types, defaults and validation |
| `src/locales` and `src/styles` | Matching ES/RU message catalogs, theme tokens and responsive styling |
| `src/pwa` and `scripts` | Worker registration and status, offline asset list, build validation and release fixtures |

Child mode is the default on launch. The app shell guards parent destinations,
including pasted and bookmarked hashes, and remembers the child screen while
the parent view is open. Route and mode changes deactivate the current practice
controller. The parent prompt also covers the practice and suspends it.

A central preference repository validates changes, persists them and publishes
the updated snapshot. System theme follows the device's current preference.
Light and dark override it. Locale files store UI text and interpolation
parameters. Format numbers, units, and dates at the view boundary. Keep
non-React repositories and engine code independent of the view adapters.

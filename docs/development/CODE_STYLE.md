# Code and documentation style

Development conventions for MathHero 1.2.

- Write repository documentation and source comments in English. Keep visible
  app strings in the ES and RU catalogs with matching keys and parameters.
  Format quantities, times and dates for the selected locale.
- Keep math, interval and reward logic in the engine. Inject clocks and random
  sources for deterministic scheduling and tests. Keep I/O in repositories.
- Preserve transactional writes, the saved question and policy semantics, and
  existing ID formats. See [engine boundaries](../architecture/ENGINE.md)
  and [storage compatibility](../architecture/STORAGE.md).
- Reuse theme tokens and shared controls. Check both themes, keyboard and
  touch paths, reduced motion, safe areas and both orientations for UI changes.
- Keep tests close to behavior. Use synthetic histories and record the actual
  execution environment and results in handoffs.

# Math Hero

Тренажёр таблицы умножения 1–12 для iPhone и iPad. React + TypeScript + Vite,
RU/ES, без backend и аккаунтов. Лицензия MIT.

Реализованы **диагностика и адаптивное обучение**: все 144 направления / 78 пар,
диагностика 6 × 24, ежедневные и weak-занятия по 24 задания, интервальные повторы,
мастерство по evidence в разные дни, пауза, раннее завершение, восстановление
после перезагрузки и реальные итоги. Диагностика задаёт исходную сложность,
но не присваивает мастерство или награды.
Статус всей разработки ведёт координатор в [docs/DELIVERY.md](docs/DELIVERY.md).

## Локальный запуск

Требуется Node.js 24 (не ниже 24.15), npm. Проверено с Node 24.22.1 / npm 11.19.1.
Проектная `.npmrc` задаёт официальный registry, не меняя глобальные настройки.

```powershell
npm ci
npm run dev
```

Открыть `http://127.0.0.1:5173/MathHero/`. Навигация использует hash, поэтому
будущему статическому GitHub Pages не нужны серверные rewrite-правила.

## Проверки

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run browsers:install
npm run test:e2e
```

Playwright сам запускает preview готовой сборки на порту 4173. Перед ним
нужно выполнить `npm run build`. Проверяются Chromium и WebKit, четыре размера
viewport в каждом, RU/ES, навигация, ввод, диагностика, адаптация и восстановление. Это эмуляция,
а не приёмка на реальных iPhone/iPad. HTML-отчёт — `playwright-report/index.html`,
снимки — `test-results/` (оба каталога исключены из Git).

## Структура

- `src/app` — оболочка, hash-навигация, настройки IndexedDB и локализация.
- `src/components` — общие элементы, клавиатура и SVG-лис.
- `src/features` — главная, тренировка, статистика, карта, настройки.
- `src/engine/core` — чистые контракты упражнения, движка, часов и RNG.
- `src/engine/multiplication` — факты, canonical ID, генерация и оценка.
- `src/engine/sessions` — диагностика, активное время и расчёт итогов.
- `src/engine/learning` — scheduler, difficulty/mastery, интервалы и learning-сессии.
- `src/database` — Dexie v2, транзакции attempts/sessions/progress, настройки.
- `src/locales` — все тексты интерфейса.
- `tests` — component/unit и browser acceptance.
- `docs/stages` — фактические результаты этапов и точки передачи.

Контракты и ограничения диагностики: [отчёт этапа 2](docs/stages/02-engine-diagnostics.md).
Контракты адаптации: [отчёт этапа 3](docs/stages/03-adaptive-learning.md).
Полное хранение и аналитика — в этапе 4,
PWA и GitHub Pages — в этапе 5. Не подключайте React к `engine`.

## Зависимости и публикация

Прямые зависимости закреплены точными версиями, lockfile включён. TypeScript
6.0.3 выбран по peer-диапазону typescript-eslint (`<6.1.0`). Scoped override
`@typescript-eslint/typescript-estree → minimatch 11.0.1` устраняет
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
в lint-инструментах. При обновлении typescript-eslint проверить, нужен ли override.

Production build — только `dist/`, base **`/MathHero/`**. Спецификация и прочие
исходные документы туда не копируются. GitHub Actions и PWA на этапах 1–3 не
создаются; совместимость версий Actions необходимо проверить на этапе 5.

Сведения о совместимости инструментов: [Vite](https://vite.dev/guide/),
[Vitest](https://vitest.dev/guide/),
[браузеры Playwright](https://playwright.dev/docs/browsers).

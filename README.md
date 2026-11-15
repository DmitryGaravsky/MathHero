# Math Hero

Тренажёр таблицы умножения 1–12 для iPhone и iPad. React + TypeScript + Vite,
RU/ES, без backend и аккаунтов. Лицензия MIT.

Сейчас реализована **основа интерфейса**: пять экранов, локализация и проба
ввода. Проба не проверяет знания, не создаёт историю и не начисляет награды.
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
viewport в каждом, RU/ES, навигация, ввод и базовая адаптивность. Это эмуляция,
а не приёмка на реальных iPhone/iPad. HTML-отчёт — `playwright-report/index.html`,
снимки — `test-results/` (оба каталога исключены из Git).

## Структура

- `src/app` — оболочка, hash-навигация, настройки в памяти и локализация.
- `src/components` — общие элементы, клавиатура и SVG-лис.
- `src/features` — главная, тренировка, статистика, карта, настройки.
- `src/engine/core` — чистые контракты упражнения, движка, часов и RNG.
- `src/locales` — все тексты интерфейса.
- `tests` — component/unit и browser acceptance.
- `docs/stages` — фактические результаты этапов и точки передачи.

В этапе 2 добавляются математический движок, диагностика и минимальный слой
IndexedDB; адаптация — в этапе 3, полное хранение и аналитика — в этапе 4,
PWA и GitHub Pages — в этапе 5. Не подключайте React к `engine`.

## Зависимости и публикация

Прямые зависимости закреплены точными версиями, lockfile включён. TypeScript
6.0.3 выбран по peer-диапазону typescript-eslint (`<6.1.0`). Scoped override
`@typescript-eslint/typescript-estree → minimatch 11.0.1` устраняет
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
в lint-инструментах. При обновлении typescript-eslint проверить, нужен ли override.

Production build — только `dist/`, base **`/MathHero/`**. Спецификация и прочие
исходные документы туда не копируются. GitHub Actions и PWA на этапе 1 не
создаются; совместимость версий Actions необходимо проверить на этапе 5.

Сведения о совместимости инструментов: [Vite](https://vite.dev/guide/),
[Vitest](https://vitest.dev/guide/),
[браузеры Playwright](https://playwright.dev/docs/browsers).

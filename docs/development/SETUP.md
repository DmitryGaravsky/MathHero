# Local setup

Status — active development instructions for MathHero 1.1.

Use Git, npm and Node.js 24.15 or later within the 24 series. The release
workflow uses Node 24.22.1. The project `.npmrc` selects the public registry
for this checkout. Install dependencies from the committed lockfile.

```powershell
npm ci
npm run dev
```

Open [local development](http://127.0.0.1:5173/MathHero/). Stop any preview
using this checkout before replacing dependencies, especially on Windows.

The development server does not register a service worker. To inspect the
production app, run `npm run build` and `npm run preview -- --port 4173`,
then open [local preview](http://127.0.0.1:4173/MathHero/). Dev and preview have
different origins and independent learning history. The
[testing instructions](TESTING.md) cover production browser fixtures.

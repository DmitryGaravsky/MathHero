import { expect, test, type Page } from "@playwright/test";
import { openParent } from "../support/parentMode";

async function ready(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}
async function registration(page: Page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { scope: reg?.scope, waiting: reg?.waiting?.state, active: reg?.active?.state };
  });
}
async function data(page: Page) {
  return page.evaluate(async () => {
    const open = indexedDB.open("math-hero");
    const db = await new Promise<IDBDatabase>((resolve) => { open.onsuccess = () => resolve(open.result); });
    const tx = db.transaction(["sessions", "attempts"]);
    const read = (name: string) => new Promise<unknown[]>((resolve) => {
      const get = tx.objectStore(name).getAll();
      get.onsuccess = () => resolve(get.result);
    });
    const [sessions, attempts] = await Promise.all([read("sessions"), read("attempts")]);
    db.close();
    return {
      sessions: sessions as { draft: string; activeMs: number }[],
      attempts: attempts as { responseTimeMs: number }[],
    };
  });
}
async function start(page: Page) {
  await page.getByRole("link", { name: "Empezar a practicar" }).click();
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await expect(page.getByRole("textbox")).toBeEnabled();
}
async function waitUpdate(page: Page) {
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(async () => (await registration(page)).waiting).toBe("installed");
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4174/__test/release?version=A");
});

test("production manifest, scoped assets, offline learning and new-window resume", async ({ page, context }, info) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await ready(page);
  expect((await registration(page)).scope).toBe("http://127.0.0.1:4174/MathHero/");
  const manifest = await page.evaluate(async () => (await fetch("manifest.webmanifest")).json());
  expect(manifest).toMatchObject({ id: "/MathHero/", scope: "/MathHero/", start_url: "/MathHero/", display: "standalone" });
  expect(manifest.icons).toHaveLength(3);
  await openParent(page, "settings");
  await expect(page.getByTestId("offline-status")).toHaveText("Lista para practicar sin conexión.");
  await page.screenshot({ path: info.outputPath("offline-settings-es.png"), fullPage: true });
  await page.getByRole("banner").getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.getByTestId("offline-status")).toHaveText("Можно заниматься без интернета.");
  await page.screenshot({ path: info.outputPath("offline-settings-ru.png"), fullPage: true });
  await page.getByRole("banner").getByRole("button", { name: "Español", exact: true }).click();
  await page.getByRole("button", { name: "Modo infantil", exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await start(page);
  const equation = await page.locator(".equation").getAttribute("aria-label");
  await page.getByRole("textbox").fill("42");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect.poll(async () => (await data(page)).sessions[0]?.draft).toBe("42");
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("./#training");
  await expect(reopened.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await reopened.getByRole("button", { name: "Continuar práctica" }).click();
  await expect(reopened.getByRole("textbox")).toHaveValue("42");
  await expect(reopened.locator(".equation")).toHaveAttribute("aria-label", equation!);
  await reopened.getByRole("textbox").press("Enter");
  await expect.poll(async () => (await data(reopened)).attempts.length).toBe(1);
  await reopened.reload();
  await expect(reopened.getByRole("status")).toBeVisible();
  const assets = await reopened.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith("math-hero:/MathHero/:"));
    return (await (await caches.open(names[0]!)).keys()).map((request) => request.url);
  });
  expect(assets).toHaveLength(9);
  expect(assets.every((url) => url.startsWith("http://127.0.0.1:4174/MathHero/"))).toBe(true);
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4174/MathHero/"))).toBe(true);
});

test("an update waits for all tabs, preserves draft and paused time, then launches offline", async ({ page, context, request }, info) => {
  await page.goto("./");
  await ready(page);
  await page.evaluate(async () => {
    await (await caches.open("another-github-pages-app")).put("/OtherApp/sentinel", new Response("keep"));
  });
  const other = await context.newPage();
  await other.goto("./#settings");
  await openParent(other);
  await ready(other);
  await start(page);
  await page.getByRole("textbox").fill("123");
  await expect.poll(async () => (await data(page)).sessions[0]?.draft).toBe("123");
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await request.post("http://127.0.0.1:4174/__test/release?version=B");
  await waitUpdate(page);
  await expect(page.getByRole("textbox")).toHaveValue("123");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(page.locator("html")).toHaveAttribute("data-release", "A");
  await expect(other.getByTestId("offline-status")).toContainText("actualización preparada");
  await other.screenshot({ path: info.outputPath("waiting-update.png"), fullPage: true });
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const pausedMs = (await data(page)).sessions[0]!.activeMs;
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-release", "A");
  expect((await data(page)).sessions[0]!.activeMs).toBe(pausedMs);
  await page.close();
  expect((await registration(other)).waiting).toBe("installed");
  // Leaving the last app page releases its controller, allowing natural activation.
  await other.goto("about:blank");
  await context.setOffline(true);
  const next = await context.newPage();
  await expect(async () => {
    await next.goto("./#training");
    await expect(next.locator("html")).toHaveAttribute("data-release", "B");
  }).toPass({ timeout: 15000 });
  await next.getByRole("button", { name: "Continuar práctica" }).click();
  await expect(next.getByRole("textbox")).toHaveValue("123");
  await next.getByRole("textbox").press("Enter");
  await expect.poll(async () => (await data(next)).attempts.length).toBe(1);
  const recorded = (await data(next)).attempts[0]!.responseTimeMs;
  expect(recorded - pausedMs).toBeLessThan(1200);
  const names = await next.evaluate(() => caches.keys());
  expect(names.filter((name) => name.startsWith("math-hero:/MathHero/:"))).toHaveLength(1);
  expect(names).toContain("another-github-pages-app");
  expect(await next.evaluate(async () => (await (await caches.open("another-github-pages-app")).match("/OtherApp/sentinel"))?.text())).toBe("keep");
});

test("a failed update keeps the complete old release and retries after reconnection", async ({ page, request, context }) => {
  await page.goto("./#settings");
  await openParent(page);
  await ready(page);
  await request.post("http://127.0.0.1:4174/__test/release?version=C&fail=true");
  await page.evaluate(async () => {
    const reg = (await navigator.serviceWorker.getRegistration())!;
    const failed = new Promise<void>((resolve) => reg.addEventListener("updatefound", () => {
      const worker = reg.installing!;
      worker.addEventListener("statechange", () => { if (worker.state === "redundant") resolve(); });
    }, { once: true }));
    await reg.update();
    await failed;
  });
  expect((await registration(page)).waiting).toBeUndefined();
  expect((await page.evaluate(() => caches.keys())).filter((name) => name.endsWith("-C"))).toHaveLength(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-release", "A");
  await openParent(page);
  await expect(page.getByTestId("offline-status")).toHaveText("Lista para practicar sin conexión.");
  await request.post("http://127.0.0.1:4174/__test/release?version=C");
  await context.setOffline(false);
  await waitUpdate(page);
  await expect(page.getByTestId("offline-status")).toContainText("actualización preparada");
});

test("an incomplete first install reports unavailability and retries on reconnect", async ({ page, request, context }) => {
  await request.post("http://127.0.0.1:4174/__test/release?version=A&fail=icon");
  await page.goto("./#settings");
  await openParent(page);
  await expect(page.getByTestId("offline-status")).toContainText("No se ha podido preparar");
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(false);
  expect((await page.evaluate(() => caches.keys())).filter((name) => name.startsWith("math-hero:/MathHero/:"))).toHaveLength(0);
  await context.setOffline(true);
  await request.post("http://127.0.0.1:4174/__test/release?version=A");
  await context.setOffline(false);
  await ready(page);
  await expect(page.getByTestId("offline-status")).toHaveText("Lista para practicar sin conexión.");
  await context.setOffline(true);
  await page.reload();
  await openParent(page);
  await expect(page.getByTestId("offline-status")).toHaveText("Lista para practicar sin conexión.");
});

test("records desktop cold online and warm offline startup samples", async ({ browser }, info) => {
  const cold: number[] = [];
  const offline: number[] = [];
  for (let sample = 0; sample < 5; sample++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4174/MathHero/");
    await expect(page.getByRole("link", { name: "Empezar a practicar" })).toBeVisible();
    cold.push(Math.round(await page.evaluate(() => performance.now())));
    await ready(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("link", { name: "Empezar a practicar" })).toBeVisible();
    offline.push(Math.round(await page.evaluate(() => performance.now())));
    await context.close();
  }
  const result = { browser: info.project.name, platform: process.platform, conditions: "Desktop browser, local HTTP loopback, no throttling, fresh empty IndexedDB per cold sample, navigation to visible practice link", coldMs: cold, warmOfflineMs: offline };
  console.log(JSON.stringify(result));
  await info.attach("startup-samples", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});

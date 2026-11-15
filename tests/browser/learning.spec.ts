import { expect, test, type Page } from "@playwright/test";

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const open = indexedDB.open("math-hero");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(["sessions", "attempts", "progress"]);
    const read = (name: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const get = tx.objectStore(name).getAll();
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
    const [sessions, attempts, progress] = await Promise.all([
      read("sessions"),
      read("attempts"),
      read("progress"),
    ]);
    db.close();
    return {
      sessions: sessions as {
        id: string;
        mode: string;
        phase: string;
        cursor: number;
        order: string[];
        draft: string;
        activeMs: number;
        targetPair?: string;
      }[],
      attempts: attempts as {
        mode: string;
        canonicalId: string;
        responseTimeMs: number;
      }[],
      progress: progress as {
        attempts: number;
        errors: number;
        masteredAt: number | null;
      }[],
    };
  });
}
async function answer(page: Page, wrong = false) {
  const input = page.getByRole("textbox");
  await expect(input).toBeEnabled();
  const equation = (await page
    .locator(".equation")
    .getAttribute("aria-label"))!;
  const operands = equation.split(" × ").map(Number);
  await input.fill(wrong ? "0" : String(operands[0]! * operands[1]!));
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    wrong ? "La respuesta correcta" : "¡Correcto!",
  );
  return operands.sort((a, b) => a - b).join(":");
}

test("completes a real daily session, repeats the error, restores feedback and shows localized results", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto("./");
  await page.getByRole("link", { name: "Empezar a practicar" }).click();
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await expect(page.getByText("CALENTAMIENTO · 1 / 24")).toBeVisible();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("daily-question.png"),
    fullPage: true,
  });
  const first = await answer(page, true);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  for (let i = 1; i < 24; i++) {
    const pair = await answer(page);
    if (i === 1 || i === 2) expect(pair).not.toBe(first);
    if (i === 3) expect(pair).toBe(first);
    await page
      .getByRole("button", {
        name: i === 23 ? "Ver resumen" : "Siguiente",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Práctica completada" }),
  ).toBeVisible();
  await expect(
    page.getByText("Correctas: 23 de 24.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("95,8%", { exact: true })).toBeVisible();
  const data = await snapshot(page);
  expect(data.attempts).toHaveLength(24);
  expect(data.progress.reduce((n, p) => n + p.attempts, 0)).toBe(24);
  expect(data.progress.every((p) => p.masteredAt === null)).toBe(true);
  await page.reload();
  await expect(
    page.getByText("Correctas: 23 de 24.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(
    page.getByText("Правильно: 23 из 24.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("daily-summary-ru.png"),
    fullPage: true,
  });
  await page.locator('nav a[href="#results"]').click();
  await expect(
    page.getByRole("heading", { name: "Последнее занятие" }),
  ).toBeVisible();
  await expect(
    page.getByText("Правильно: 23 из 24.", { exact: true }),
  ).toBeVisible();
});

test("restores a paused learning draft, excludes hidden time and commits a same-tick double submit only once", async ({
  page,
}) => {
  await page.goto("./#training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await page.getByRole("textbox").fill("12");
  await expect
    .poll(async () => (await snapshot(page)).sessions[0]?.draft)
    .toBe("12");
  const order = (await snapshot(page)).sessions[0]!.order;
  await page.reload();
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar práctica" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("12");
  expect((await snapshot(page)).sessions[0]!.order).toEqual(order);
  // Adapter check only, not actual iOS background behavior.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  const elapsed = (await snapshot(page)).sessions[0]!.activeMs;
  await page.waitForTimeout(350);
  expect((await snapshot(page)).sessions[0]!.activeMs).toBe(elapsed);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("button", { name: "Continuar práctica" }).click();
  await page.getByRole("textbox").fill("0");
  await page.locator("form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  const data = await snapshot(page);
  expect(data.attempts).toHaveLength(1);
  expect(data.progress).toHaveLength(1);
  expect(data.progress[0]!.attempts).toBe(1);
});

test("ends early from a restored pause, retains the summary and starts another independent session", async ({
  page,
}) => {
  await page.goto("./#training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await answer(page);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Terminar esta práctica" }).click();
  await expect(
    page.getByRole("heading", { name: "Práctica guardada" }),
  ).toBeVisible();
  await expect(
    page.getByText("Correctas: 1 de 1.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Correctas: 1 de 1.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva práctica" }).click();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.getByRole("button", { name: "Terminar esta práctica" }).click();
  await expect(
    page.getByText("Correctas: 0 de 0.", { exact: true }),
  ).toBeVisible();
  const data = await snapshot(page);
  expect(data.sessions).toHaveLength(2);
  expect(data.attempts).toHaveLength(1);
});

test("targeted weak practice uses the requested canonical pair with fillers, and diagnosis remains separate", async ({
  page,
}) => {
  await page.goto("./#weak?pair=mul%3A8%3A7");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  expect(await answer(page, true)).toBe("7:8");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  for (let i = 1; i <= 3; i++) {
    const pair = await answer(page);
    if (i < 3) expect(pair).not.toBe("7:8");
    else expect(pair).toBe("7:8");
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  }
  const before = await snapshot(page);
  expect(before.sessions[0]).toMatchObject({
    mode: "weak",
    targetPair: "mul:7:8",
  });
  await page.goto("./#diagnostic");
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await answer(page, true);
  const after = await snapshot(page);
  expect(after.attempts.filter((a) => a.mode === "diagnostic")).toHaveLength(1);
  expect(after.progress).toEqual(before.progress);
});

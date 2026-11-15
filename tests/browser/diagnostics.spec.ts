import { expect, test, type Page } from "@playwright/test";

async function databaseSnapshot(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("math-hero");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction(["sessions", "attempts"]);
    const read = <T>(r: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    const [session, attempts] = await Promise.all([
      read(tx.objectStore("sessions").get("diagnostic:baseline:v1")),
      read(tx.objectStore("attempts").getAll()),
    ]);
    database.close();
    return {
      session: session as {
        cursor: number;
        draft: string;
        order: string[];
        phase: string;
        activeMs: number;
        owner: string;
      },
      attempts: attempts as {
        exerciseId: string;
        responseTimeMs: number;
        correct: boolean;
      }[],
    };
  });
}
async function answer(page: Page, value?: string) {
  await expect(page.getByRole("textbox")).toBeEnabled();
  const equation = (await page
    .locator(".equation")
    .getAttribute("aria-label"))!;
  const [a, b] = equation.split(" × ").map(Number);
  await page.getByRole("textbox").fill(value ?? String(a! * b!));
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText(
    value === "0" ? "La respuesta correcta" : "¡Correcto!",
  );
  return equation;
}

test("completes a part, restores draft and feedback, records an error once and resumes the next part", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("./");
  await page.getByRole("link", { name: "Empezar diagnóstico" }).click();
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  const initial = await page.locator(".equation").getAttribute("aria-label");
  await page.getByRole("textbox").fill("12");
  await expect
    .poll(async () => (await databaseSnapshot(page)).session.draft)
    .toBe("12");
  const initialOrder = (await databaseSnapshot(page)).session.order;
  await page.reload();
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar diagnóstico" }).click();
  await expect(page.locator(".equation")).toHaveAttribute(
    "aria-label",
    initial!,
  );
  await expect(page.getByRole("textbox")).toHaveValue("12");
  await answer(page, "0");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  expect((await databaseSnapshot(page)).attempts).toHaveLength(1);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  const seen = new Set([initial]);
  for (let i = 1; i < 24; i++) {
    seen.add(await answer(page));
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Parte 1 completada" }),
  ).toBeVisible();
  expect(seen.size).toBe(24);
  const snapshot = await databaseSnapshot(page);
  expect(snapshot.attempts).toHaveLength(24);
  expect(snapshot.attempts.filter((a) => a.correct)).toHaveLength(23);
  expect(snapshot.session.order).toEqual(initialOrder);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Parte 1 completada" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Empezar la siguiente parte" })
    .click();
  await expect(page.getByText("PARTE 2 / 6 · 1 / 24")).toBeVisible();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page.locator('nav a[href="#home"]').click();
  await expect(
    page.getByRole("link", { name: "Continuar diagnóstico" }),
  ).toBeVisible();
  await page.locator('nav a[href="#results"]').click();
  await expect(
    page.getByText("Correctas: 23 de 24.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("95,8%")).toBeVisible();
});

test("guards same-tick double submit and persists language and animation settings", async ({
  page,
}) => {
  await page.goto("./#diagnostic");
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await page.getByRole("textbox").fill("0");
  await page.locator("form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  expect((await databaseSnapshot(page)).attempts).toHaveLength(1);
  await page.locator('nav a[href="#settings"]').click();
  await page.getByRole("switch").click();
  await page
    .getByRole("button", { name: "Русский", exact: true })
    .first()
    .click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const request = indexedDB.open("math-hero");
        const database = await new Promise<IDBDatabase>((resolve) => {
          request.onsuccess = () => resolve(request.result);
        });
        const get = database
          .transaction("settings")
          .objectStore("settings")
          .get("preferences");
        const row = await new Promise<{
          value: { language: string; animationsEnabled: boolean };
        }>((resolve) => {
          get.onsuccess = () => resolve(get.result);
        });
        database.close();
        return row.value;
      }),
    )
    .toMatchObject({ language: "ru", animationsEnabled: false });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("hidden-page event pauses the question and requires explicit resume", async ({
  page,
}) => {
  await page.goto("./#diagnostic");
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await page.getByRole("textbox").fill("7");
  // Tests the visibility adapter; this is not a claim of real device background testing.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await expect
    .poll(async () => (await databaseSnapshot(page)).session.draft)
    .toBe("7");
  const elapsed = (await databaseSnapshot(page)).session.activeMs;
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  expect((await databaseSnapshot(page)).session.activeMs).toBe(elapsed);
  await page.getByRole("button", { name: "Continuar diagnóstico" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("7");
});

test("finishes all six parts and shows real diagnostic results", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.endsWith("phone-portrait"),
    "Full flow in Chromium/WebKit portrait; part flow covers all sizes.",
  );
  test.setTimeout(180000);
  await page.goto("./#diagnostic");
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  for (let i = 1; i <= 144; i++) {
    await answer(page);
    await page
      .getByRole("button", {
        name: i === 144 ? "Ver resumen" : "Siguiente",
        exact: true,
      })
      .click();
    if (i % 24 === 0 && i < 144)
      await page
        .getByRole("button", { name: "Empezar la siguiente parte" })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "Diagnóstico completado" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver mis resultados" }).click();
  await expect(
    page.getByText("Correctas: 144 de 144.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
  const { attempts } = await databaseSnapshot(page);
  expect(attempts).toHaveLength(144);
  expect(new Set(attempts.map((a) => a.exerciseId)).size).toBe(144);
  await page.reload();
  await expect(
    page.getByText("Correctas: 144 de 144.", { exact: false }),
  ).toBeVisible();
});

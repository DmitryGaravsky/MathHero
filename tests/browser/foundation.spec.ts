import { expect, test } from "@playwright/test";

test("all five screens and both locales fit the viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Una pequeña misión",
  );
  for (const language of ["ru", "es"]) {
    await page
      .getByRole("button", {
        name: language === "ru" ? "Русский" : "Español",
        exact: true,
      })
      .first()
      .click();
    for (const route of ["home", "training", "results", "map", "settings"]) {
      await page.locator(`nav a[href="#${route}"]`).click();
      await expect(page.locator(`nav a[href="#${route}"]`)).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const buttons = await page
        .locator("button:visible, nav a")
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      expect(buttons.every((height) => height >= 52)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test("keypad, physical keyboard, native input path and empty submit", async ({
  page,
}) => {
  await page.goto("./#training");
  const input = page.getByRole("textbox", { name: "Tu respuesta" });
  await expect(
    page.getByRole("button", { name: "Confirmar respuesta" }),
  ).toBeDisabled();
  if (page.viewportSize()?.width === 390) {
    const confirm = await page
      .getByRole("button", { name: "Confirmar respuesta" })
      .boundingBox();
    const navigation = await page.locator("nav").boundingBox();
    expect(confirm!.y + confirm!.height).toBeLessThanOrEqual(navigation!.y);
  }
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  await expect(input).toHaveValue("56");
  await page.getByRole("button", { name: "Borrar última cifra" }).click();
  await expect(input).toHaveValue("5");
  await input.focus();
  await page.keyboard.press("6");
  await expect(input).toHaveValue("56");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Has escrito 56");
  await page.getByRole("button", { name: "Probar otra vez" }).click();
  await page
    .getByRole("button", { name: "Usar teclado del dispositivo" })
    .click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await expect(
    page.getByRole("group", { name: "Teclado numérico" }),
  ).toHaveCount(0);
  await input.fill("1449");
  await expect(input).toHaveValue("144");
  await page.getByRole("button", { name: "Usar teclado de Math Hero" }).click();
  await expect(input).toHaveValue("144");
  await page.getByRole("button", { name: "Confirmar respuesta" }).click();
  await expect(page.getByRole("status")).toContainText("Has escrito 144");
  await page.getByRole("button", { name: "Probar otra vez" }).click();
  await page.getByRole("button", { name: "5", exact: true }).focus();
  await page.keyboard.type("56");
  await expect(input).toHaveValue("56");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Has escrito 56");
});

test("preview has no invented progress, supports back and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(
    page.getByText("todavía no se guarda progreso.", { exact: false }),
  ).toBeVisible();
  expect(
    await page
      .locator(".hero .mascot")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.locator('nav a[href="#results"]').click();
  await expect(
    page.getByText("Aún no hay sesiones guardadas.", { exact: false }),
  ).toBeVisible();
  await page.locator('nav a[href="#map"]').click();
  await expect(page.locator(".map-cell")).toHaveCount(144);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cada paso cuenta",
  );
});

test("captures the foundation for visual review", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page.goto("./#training");
  await page.screenshot({
    path: testInfo.outputPath("training.png"),
    fullPage: true,
  });
});

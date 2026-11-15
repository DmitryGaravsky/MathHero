import { expect, test } from "@playwright/test";
import { openParent, parentNav } from "../support/parentMode";

test("all five screens and both locales fit the viewport", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Una pequeña misión",
  );
  await openParent(page);
  for (const language of ["ru", "es"]) {
    await page
      .getByRole("button", {
        name: language === "ru" ? "Русский" : "Español",
        exact: true,
      })
      .first()
      .click();
    for (const route of ["home", "training", "results", "map", "settings"]) {
      await parentNav(page, route).click();
      await expect(parentNav(page, route)).toHaveAttribute(
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
        .locator("button:visible:not(.map-cell), select:visible, nav a")
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
  await page.goto("./#diagnostic");
  await openParent(page);
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
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
  await expect(page.getByRole("status")).toContainText(
    /¡Correcto!|La respuesta correcta/,
  );
  await page.getByRole("button", { name: "Siguiente" }).click();
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
  await expect(page.getByRole("status")).toContainText(
    /¡Correcto!|La respuesta correcta/,
  );
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "5", exact: true }).focus();
  await page.keyboard.type("56");
  await expect(input).toHaveValue("56");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    /¡Correcto!|La respuesta correcta/,
  );
});

test("preview has no invented progress, supports back and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator(".journey-card")).toContainText("0 / 78");
  expect(
    await page
      .locator(".hero .mascot")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await openParent(page);
  await parentNav(page, "results").click();
  await expect(
    page.getByText("Aún no hay respuestas guardadas.", { exact: false }),
  ).toBeVisible();
  await parentNav(page, "map").click();
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page.goto("./#diagnostic");
  await openParent(page);
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await expect(page.locator(".equation")).toBeVisible();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("training.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await page.getByRole("textbox").fill("0");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("Правильный ответ");
  await page.screenshot({
    path: testInfo.outputPath("feedback-ru.png"),
    fullPage: true,
  });
  await parentNav(page, "results").click();
  await expect(
    page.getByText("Правильно: 0 из 1.", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("results-ru.png"),
    fullPage: true,
  });
});

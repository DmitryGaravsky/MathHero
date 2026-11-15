import { expect, type Page } from "@playwright/test";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };

export function parentNav(page: Page, route: string) {
  return page.locator(`nav a[href="#parent/${route}"]`);
}

export async function openParent(page: Page, destination?: string, pin = "1234") {
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  const opener = page.getByRole("button", { name: /^(Modo adulto|Для родителей)$/ });
  const locale = await opener.textContent() === ru.parentMode ? ru : es;
  await opener.click();
  const dialog = page.getByRole("dialog", { name: locale.parentMode });
  await dialog.getByLabel(locale.parentPin).fill(pin);
  await dialog.getByRole("button", { name: locale.parentEnter, exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "parent");
  if (destination) await parentNav(page, destination).click();
}

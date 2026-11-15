import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppProvider } from "../src/app/providers";
import { App } from "../src/app/App";
import { Training } from "../src/features/training/Training";
import { Settings } from "../src/features/settings/Settings";
import es from "../src/locales/es.json";
import ru from "../src/locales/ru.json";
import { normalizeAnswer } from "../src/features/training/answerInput";

describe("foundation", () => {
  it("keeps complete locale key and interpolation parity", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(es).sort());
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(ru[key].trim()).not.toBe("");
      expect(ru[key].match(/\{\w+\}/g)).toEqual(es[key].match(/\{\w+\}/g));
    }
  });
  it("starts in Spanish, switches all navigation and document language", async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <App />
      </AppProvider>,
    );
    expect(document.documentElement.lang).toBe("es");
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Una pequeña misión",
    );
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(document.documentElement.lang).toBe("ru");
    expect(
      screen.getByRole("link", { name: "Диагностика" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Маленькая миссия",
    );
  });
  it("accepts keypad input, erases, submits once and clears for retry", async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <Training />
      </AppProvider>,
    );
    await user.click(await screen.findByRole("button", { name: es.start }));
    expect(
      await screen.findByRole("button", { name: es.confirm }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("button", { name: es.erase }));
    await user.click(screen.getByRole("button", { name: "6" }));
    expect(screen.getByRole("textbox")).toHaveValue("56");
    await user.click(screen.getByRole("button", { name: es.confirm }));
    expect(await screen.findAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("textbox")).toHaveValue("56");
    expect(screen.getByRole("status")).toHaveTextContent(
      /¡Correcto!|La respuesta correcta/,
    );
    await user.click(screen.getByRole("button", { name: es.next }));
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  });
  it("does not double physical input and preserves value across keyboard modes", async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <Training />
      </AppProvider>,
    );
    await user.click(await screen.findByRole("button", { name: es.start }));
    await user.click(await screen.findByRole("textbox"));
    await user.keyboard("56{Backspace}4");
    expect(screen.getByRole("textbox")).toHaveValue("54");
    await user.click(screen.getByRole("button", { name: es.systemKeyboard }));
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "numeric");
    expect(
      screen.queryByRole("group", { name: es.keypad }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("54");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("status")).toHaveTextContent(
      /¡Correcto!|La respuesta correcta/,
    );
  });
  it("limits input to three ASCII digits, including pasted text", () => {
    expect(normalizeAnswer("a1.4-4xyz9")).toBe("144");
    expect(normalizeAnswer("")).toBe("");
    expect(normalizeAnswer("0000")).toBe("000");
  });
  it("defaults animations on and allows disabling them", async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <Settings />
      </AppProvider>,
    );
    const toggle = await screen.findByRole("switch", { name: es.animations });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(es.soundHint)).toBeInTheDocument();
  });
});

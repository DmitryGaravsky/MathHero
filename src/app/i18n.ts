import es from "../locales/es.json";
import ru from "../locales/ru.json";
import type { Language } from "../settings/preferences";

export type Messages = typeof es;
export type MessageKey = keyof Messages;
export const messages: Record<Language, Messages> = { es, ru };

export function translate(
  language: Language,
  key: MessageKey,
  values: Record<string, string> = {},
): string {
  return messages[language][key].replace(
    /\{(\w+)\}/g,
    (match, name: string) => values[name] ?? match,
  );
}

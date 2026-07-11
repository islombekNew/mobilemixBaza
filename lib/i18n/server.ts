import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Server komponentlar uchun i18n. Cookie'dan tilni o'qib, mos lug'atni
 * qaytaradi.
 *
 * Ishlatilishi (server komponent):
 *   const t = await getDict();
 *   <h1>{t.inventory.title}</h1>
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getDict(): Promise<Dictionary> {
  const locale = await getLocale();
  return dictionaries[locale];
}

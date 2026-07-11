"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Client komponentlar uchun i18n. Root layout (server) joriy tilni aniqlaydi
 * va <LanguageProvider>ni tegishli lug'at bilan render qiladi. Client
 * komponentlar `useT()` orqali lug'atга, `useLocale()` orqali joriy tilga
 * kirishadi.
 */

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: dictionaries[DEFAULT_LOCALE],
});

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

/** Joriy til lug'ati — client komponentlarda: const t = useT(); t.common.save */
export function useT(): Dictionary {
  return useContext(I18nContext).t;
}

/** Joriy til kodi (uz/ru/en). */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

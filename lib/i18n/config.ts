/**
 * Ko'p tillilik (i18n) sozlamalari.
 *
 * Til tanlovi URL'da emas, COOKIE'da saqlanadi — bu CRM login ortida
 * ishlaydigan ichki tizim, SEO/locale-routing kerak emas. Shu sababli
 * mavjud sahifa strukturasi (app/(dashboard)/...) o'zgarmaydi.
 */

export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

/** Til tanlovi saqlanadigan cookie nomi. */
export const LOCALE_COOKIE = "locale";

/** Til tugmasida ko'rsatiladigan bayroq + nom. */
export const LOCALE_META: Record<Locale, { flag: string; label: string }> = {
  uz: { flag: "🇺🇿", label: "O'zbekcha" },
  ru: { flag: "🇷🇺", label: "Русский" },
  en: { flag: "🇬🇧", label: "English" },
};

/** Noma'lum qiymatni xavfsiz Locale'ga aylantiradi. */
export function normalizeLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

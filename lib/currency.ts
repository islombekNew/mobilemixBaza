/**
 * Valyuta bilan ishlash uchun sof (pure) yordamchi funksiyalar.
 * Server ham, client komponentlar ham ishlatadi — shu sababli bu faylda
 * hech qanday DB/env bog'liqlik yo'q (kurs olish lib/exchange-rate.ts'da).
 */

export type CurrencyCode = "UZS" | "USD";

/** Istalgan valyutadagi summani so'mga o'tkazadi. */
export function toUZS(amount: number, currency: CurrencyCode, usdRate: number): number {
  return currency === "USD" ? amount * usdRate : amount;
}

/** Istalgan valyutadagi summani dollarga o'tkazadi. */
export function toUSD(amount: number, currency: CurrencyCode, usdRate: number): number {
  return currency === "UZS" ? amount / usdRate : amount;
}

/** Ikki xil valyutadagi summalarni solishtirish/ayirish uchun umumiy baza — so'm. */
export function diffInUZS(
  a: { amount: number; currency: CurrencyCode },
  b: { amount: number; currency: CurrencyCode },
  usdRate: number
): number {
  return toUZS(a.amount, a.currency, usdRate) - toUZS(b.amount, b.currency, usdRate);
}

/** "1.250.000 so'm" yoki "$530" ko'rinishida formatlaydi. */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  if (currency === "USD") {
    const rounded = Math.round(amount * 100) / 100;
    const str = Number.isInteger(rounded)
      ? rounded.toLocaleString("en-US")
      : rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${str}`;
  }
  const n = Math.round(amount);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " so'm";
}

/**
 * Asosiy valyuta + qavs ichida ikkinchisi:
 * "$530 (≈ 6.678.000 so'm)" yoki "6.678.000 so'm (≈ $530)".
 * Kurs hali yo'q bo'lsa (usdRate <= 0) faqat asosiy valyutani qaytaradi.
 */
export function formatDual(
  amount: number,
  currency: CurrencyCode,
  usdRate: number
): string {
  const primary = formatMoney(amount, currency);
  if (!usdRate || usdRate <= 0) return primary;

  if (currency === "USD") {
    return `${primary} (≈ ${formatMoney(amount * usdRate, "UZS")})`;
  }
  return `${primary} (≈ ${formatMoney(amount / usdRate, "USD")})`;
}

/**
 * Grafik Y o'qi uchun qisqa format: 1500000 → "1.5M", -500000 → "-500K",
 * 6500000 → "6.5M". Katta raqamlar kesilib qolmasligi uchun ishlatiladi.
 */
export function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${sign}${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}B`;
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}K`;
  }
  return `${sign}${abs}`;
}

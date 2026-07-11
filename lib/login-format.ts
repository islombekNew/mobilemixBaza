/**
 * Login normalizatsiyasi — telefon raqamli login uchun avtomatik "+998"
 * prefiksini qo'yadi, matnli login (masalan "namangan_sotuvchi") esa
 * o'zgarmasdan qoladi.
 *
 * Bu helper client (login formasi) ham, server (loginAction) ham ishlatadi —
 * shu tariqa foydalanuvchi 9 xonali raqam kiritsa ("882162882"), ikkala
 * tomonda ham bir xil "+998882162882" ga aylanadi.
 */

/** Kiritilgan qiymat telefon raqamiga o'xshaydimi (faqat raqam / + / bo'shliq / -). */
export function looksLikePhone(value: string): boolean {
  const cleaned = value.trim().replace(/[\s()\-]/g, "");
  return /^\+?\d+$/.test(cleaned);
}

/**
 * Loginni normal ko'rinishga keltiradi:
 *  - "882162882"        -> "+998882162882"
 *  - "998882162882"     -> "+998882162882"
 *  - "+998 88 216 28 82"-> "+998882162882"
 *  - "namangan_sotuvchi"-> "namangan_sotuvchi" (matnli login — o'zgarmaydi)
 */
export function normalizeLogin(raw: string): string {
  const v = raw.trim();
  if (!looksLikePhone(v)) return v;

  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  // Faqat mahalliy 9 xonali qismini olamiz (ortiqcha raqamlar kesiladi)
  digits = digits.slice(0, 9);

  return digits ? `+998${digits}` : "";
}

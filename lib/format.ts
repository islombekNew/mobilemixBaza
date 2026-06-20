/** 20.06.2026 ko'rinishida sana */
export function formatDate(value: Date | string): string {
  const d = new Date(value);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

/** 1.000.000 so'm ko'rinishida pul */
export function formatSum(amount: number | string): string {
  const n = Math.round(Number(amount));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " so'm";
}

/** Faqat raqam (so'm siz): 1.000.000 */
export function formatNumber(amount: number | string): string {
  const n = Math.round(Number(amount));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Kiritilgan matndan faqat raqamlarni oladi: "1.000.000" → 1000000 */
export function parseFormattedNumber(value: string): string {
  return value.replace(/\./g, "");
}

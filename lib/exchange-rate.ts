/**
 * USD/UZS kursini boshqaradi:
 *  1. Bugungi kurs bazada bo'lsa — shuni qaytaradi (API chaqirilmaydi).
 *  2. Bo'lmasa O'zbekiston Markaziy banki (CBU) API'sidan olib, bazaga
 *     saqlaydi — shu tariqa kurs kuniga bir marta yangilanadi.
 *  3. API ishlamasa — bazadagi eng oxirgi saqlangan kursdan foydalanadi.
 *  4. Baza butunlay bo'sh bo'lsa — FALLBACK_RATE.
 *
 * Bu funksiya HECH QACHON throw qilmaydi — narx ko'rsatish/hisobotlar
 * kurs API'si tufayli yiqilib qolmasligi kerak.
 */

import prisma from "@/lib/prisma";

const CBU_USD_URL = "https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/";

// CBU API va baza ham ishlamay qolgan eng yomon holat uchun taxminiy kurs.
// Faqat birinchi ishga tushirishda API o'chiq bo'lsa ishlatiladi.
const FALLBACK_RATE = 12800;

/** Toshkent vaqti bo'yicha bugungi sana (faqat kun, UTC yarim tunda). */
function todayTashkent(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // en-CA formati: "2026-07-10"
  return new Date(`${parts}T00:00:00.000Z`);
}

interface CbuRateRow {
  Ccy?: string;
  Rate?: string;
}

/** CBU API'dan bugungi USD kursini oladi. Xatoda null. */
async function fetchCbuUsdRate(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(CBU_USD_URL, {
      signal: controller.signal,
      // Next.js fetch keshiga tayanmaymiz — keshni o'zimiz bazada saqlaymiz
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as CbuRateRow[];
    const usd = Array.isArray(data)
      ? data.find((r) => r.Ccy === "USD")
      : null;
    const rate = usd?.Rate ? Number(usd.Rate) : NaN;
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch (error) {
    console.error("[exchange-rate] CBU API xatosi:", error);
    return null;
  }
}

// Process ichidagi tezkor kesh: kurs kuniga bir marta o'zgaradi, shu sababli
// bir necha daqiqa davomida bazaga qayta so'rov yubormaymiz. Bitta hisobot
// sahifasida getUsdRate() bir necha marta chaqiriladi (dashboard, xodim
// statistikasi, foyda hisobi...) — bu kesh o'sha takroriy uzoq (Railway) DB
// so'rovlarini bartaraf qiladi.
let memoRate: number | null = null;
let memoAt = 0;
const MEMO_TTL_MS = 5 * 60 * 1000; // 5 daqiqa

/**
 * Joriy USD/UZS kursini qaytaradi. Kuniga bir marta CBU'dan yangilanadi,
 * qolgan so'rovlar avval process xotirasidagi keshdan, keyin bazadagi
 * keshdan o'qiydi.
 */
export async function getUsdRate(): Promise<number> {
  // 0. Process xotirasidagi tezkor kesh (eng arzon yo'l)
  if (memoRate !== null && Date.now() - memoAt < MEMO_TTL_MS) {
    return memoRate;
  }

  const today = todayTashkent();

  try {
    // 1. Bugungi kurs allaqachon saqlanganmi?
    const cached = await prisma.exchangeRate.findUnique({
      where: { date: today },
    });
    if (cached) {
      memoRate = Number(cached.usdToUzs);
      memoAt = Date.now();
      return memoRate;
    }

    // 2. CBU'dan olishga urinamiz
    const fresh = await fetchCbuUsdRate();
    if (fresh !== null) {
      // Parallel so'rovlarda ikkinchisi unique constraint'ga urilmasligi
      // uchun upsert ishlatiladi.
      await prisma.exchangeRate.upsert({
        where: { date: today },
        create: { date: today, usdToUzs: fresh },
        update: { usdToUzs: fresh },
      });
      memoRate = fresh;
      memoAt = Date.now();
      return fresh;
    }

    // 3. API ishlamadi — oxirgi saqlangan kurs
    const latest = await prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
    });
    if (latest) {
      memoRate = Number(latest.usdToUzs);
      memoAt = Date.now();
      return memoRate;
    }
  } catch (error) {
    console.error("[exchange-rate] Kurs olishda xatolik:", error);
  }

  // 4. Hech narsa topilmadi
  return FALLBACK_RATE;
}

/**
 * Kursni MAJBURAN CBU'dan qayta oladi va bazani yangilaydi (bugungi qatorni
 * upsert qiladi). Soatlik cron shu funksiyani chaqiradi — shu tariqa kurs
 * kun davomida o'zgarsa ham (CBU yangilasa) tizim eng so'nggisini biladi,
 * hech kim sahifa ochmasa ham.
 *
 * getUsdRate()'dan farqi: u bugungi qator bo'lsa qayta so'ramaydi (tejamkor),
 * bu esa har safar CBU'ga boradi va yangi qiymatni yozadi.
 * @returns yangilangan kurs yoki null (CBU ishlamasa)
 */
export async function refreshUsdRate(): Promise<number | null> {
  const fresh = await fetchCbuUsdRate();
  if (fresh === null) return null;

  const today = todayTashkent();
  try {
    await prisma.exchangeRate.upsert({
      where: { date: today },
      create: { date: today, usdToUzs: fresh },
      update: { usdToUzs: fresh },
    });
    // Xotira keshini ham darhol yangilaymiz
    memoRate = fresh;
    memoAt = Date.now();
    return fresh;
  } catch (error) {
    console.error("[exchange-rate] Kursni yangilashda xatolik:", error);
    return null;
  }
}

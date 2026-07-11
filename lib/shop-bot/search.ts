/**
 * Mijoz boti uchun "aqlli" qidiruv (AI'siz — alias lug'ati + Levenshtein).
 *
 * Maqsad: mijoz "ayfon", "aypon", "айфон", "iphone" deb yozsa ham iPhone
 * modellari topilishi kerak. Shu tarzda barcha mashhur brendlar uchun
 * yozilish variantlari (lotin/kirill/xato yozuv) qamrab olingan; ro'yxatda
 * bo'lmagan so'zlar esa Levenshtein masofasi (<=2) bilan taqqoslanadi.
 */

import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Normalizatsiya va o'xshashlik
// ---------------------------------------------------------------------------

/** Matnni qidiruv uchun soddalashtiradi: kichik harf, ortiqcha belgilar olib tashlanadi. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’‘`ʻ]/g, "") // g'ilof -> gilof
    .replace(/[^a-zа-яё0-9+\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Klassik Levenshtein masofasi (kichik so'zlar uchun yetarli tez). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

// ---------------------------------------------------------------------------
// Brend alias lug'ati: kanonik nom -> yozilish variantlari
// ---------------------------------------------------------------------------

const BRAND_ALIASES: Record<string, string[]> = {
  iphone: ["iphone", "ayfon", "aypon", "ayfone", "afon", "ifon", "айфон", "apple", "epl", "эпл"],
  samsung: ["samsung", "samsun", "samsug", "самсунг", "galaxy", "galaksi", "гэлакси", "галакси"],
  xiaomi: ["xiaomi", "siomi", "ksiomi", "сяоми", "ксиоми", "mi"],
  redmi: ["redmi", "редми", "redmi"],
  poco: ["poco", "поко", "pokko"],
  honor: ["honor", "хонор", "onor"],
  huawei: ["huawei", "xuavey", "хуавей", "huavey"],
  oppo: ["oppo", "оппо", "opo"],
  vivo: ["vivo", "виво"],
  realme: ["realme", "realmi", "реалми", "рилми"],
  tecno: ["tecno", "texno", "техно", "tekno"],
  infinix: ["infinix", "инфиникс", "infiniks"],
  nokia: ["nokia", "нокиа", "nokiya"],
  pixel: ["pixel", "піксел", "пиксель", "google"],
  oneplus: ["oneplus", "one+", "ванплюс"],
};

/**
 * DB'da brend qanday nomlarda saqlanishi mumkinligi — kanonik nomga
 * moslash uchun (masalan iPhone telefonining brend ustuni "Apple").
 */
const CANON_DB_NAMES: Record<string, string[]> = {
  iphone: ["iphone", "apple"],
  samsung: ["samsung", "galaxy"],
  pixel: ["pixel", "google"],
};

/** So'zni kanonik brendga aylantiradi (topilmasa null). */
export function canonicalBrand(word: string): string | null {
  for (const [canon, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      if (word === alias) return canon;
      // Uzunroq so'zlarda kichik xatoga yo'l qo'yamiz: "ayfonn", "samsng"
      if (alias.length >= 4 && word.length >= 4 && levenshtein(word, alias) <= 1) {
        return canon;
      }
    }
  }
  return null;
}

/** Kanonik brend haystack (brend+model) ichida uchraydimi. */
function canonMatchesHaystack(canon: string, haystack: string): boolean {
  const names = CANON_DB_NAMES[canon] ?? [canon];
  return names.some((n) => haystack.includes(n));
}

// ---------------------------------------------------------------------------
// Telefon qidiruvi
// ---------------------------------------------------------------------------

export interface PhoneSearchResult {
  id: string;
  brand: string;
  model: string;
  color: string;
  storageGB: number;
  ramGB: number | null;
  condition: string;
  batteryHealth: number | null;
  salePrice: number;
  currency: "UZS" | "USD";
  photoUrl: string | null;
  tgPhotoFileId: string | null;
  tgVideoFileId: string | null;
}

/**
 * So'rov tokenlarga bo'linadi: brend so'zlari kanonik shaklga o'tadi,
 * raqamlar (13, 256...) modeldagi raqamlar bilan solishtiriladi, qolgan
 * so'zlar (pro, max, ultra...) fuzzy taqqoslanadi.
 */
export async function searchPhones(rawQuery: string, limit = 5): Promise<PhoneSearchResult[]> {
  const query = normalizeText(rawQuery);
  if (!query) return [];

  const tokens = query.split(" ").filter(Boolean);
  const canons = new Set<string>();
  const numbers: string[] = [];
  const words: string[] = [];

  for (const tok of tokens) {
    const canon = canonicalBrand(tok);
    if (canon) {
      canons.add(canon);
      continue;
    }
    if (/^\d+$/.test(tok)) {
      numbers.push(tok);
      continue;
    }
    // "13pro" kabi yopishgan yozuvlarni ajratamiz
    const m = tok.match(/^(\d+)([a-zа-я+]+)$/i);
    if (m) {
      numbers.push(m[1]);
      words.push(m[2]);
      continue;
    }
    words.push(tok);
  }

  const phones = await prisma.phone.findMany({
    where: { status: "IN_STOCK", deletedAt: null, archivedAt: null },
    select: {
      id: true,
      brand: true,
      model: true,
      color: true,
      storageGB: true,
      ramGB: true,
      condition: true,
      batteryHealth: true,
      salePrice: true,
      currency: true,
      photoUrl: true,
      tgPhotoFileId: true,
      tgVideoFileId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const scored: { phone: (typeof phones)[number]; score: number }[] = [];

  for (const phone of phones) {
    const haystack = normalizeText(`${phone.brand} ${phone.model}`);
    const hayTokens = haystack.split(" ").filter(Boolean);
    let score = 0;

    // 1) Brend mosligi
    if (canons.size > 0) {
      const anyCanonHit = Array.from(canons).some((c) => canonMatchesHaystack(c, haystack));
      if (!anyCanonHit) continue; // brend aytilgan bo'lsa — mos kelmagani chiqmaydi
      score += 5;
    }

    // 2) Raqamlar (model raqami, xotira)
    let numbersOk = true;
    for (const num of numbers) {
      if (haystack.includes(num) || String(phone.storageGB) === num) {
        score += 4;
      } else {
        numbersOk = false;
      }
    }
    if (numbers.length > 0 && !numbersOk) continue;

    // 3) Qolgan so'zlar (pro, max, ultra, mini...) — fuzzy
    for (const word of words) {
      let best = Infinity;
      for (const ht of hayTokens) {
        best = Math.min(best, ht.includes(word) ? 0 : levenshtein(word, ht));
      }
      if (best === 0) score += 3;
      else if (best === 1) score += 2;
      else if (best === 2 && word.length >= 4) score += 1;
      else if (canons.size === 0 && numbers.length === 0) {
        // Faqat so'zdan iborat so'rovda mos kelmagan so'z — jarima
        score -= 2;
      }
    }

    if (score > 0) {
      scored.push({ phone, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ phone }) => ({
    ...phone,
    salePrice: Number(phone.salePrice),
    currency: phone.currency === "USD" ? "USD" : "UZS",
  }));
}

// ---------------------------------------------------------------------------
// Aksesuar qidiruvi
// ---------------------------------------------------------------------------

const ACCESSORY_CATEGORIES: Record<string, string[]> = {
  gilof: ["gilof", "chexol", "chexol", "case", "чехол", "qopqoq", "kap", "cover"],
  zaryadnik: ["zaryadnik", "zaryadka", "charger", "зарядка", "зарядник", "adapter", "adaptor", "kabel", "cable", "кабель", "shnur"],
  quloqchin: ["quloqchin", "naushnik", "quloqchin", "earphone", "airpods", "наушник", "наушники", "garnitura"],
  oyna: ["oyna", "steklo", "glass", "стекло", "plyonka", "плёнка", "plenka", "himoya"],
  powerbank: ["powerbank", "паурбанк", "пауэрбанк", "paurbank"],
};

/** So'zni aksesuar kategoriyasiga moslashtiradi. */
export function canonicalAccessoryCategory(word: string): string | null {
  for (const [canon, aliases] of Object.entries(ACCESSORY_CATEGORIES)) {
    for (const alias of aliases) {
      if (word === alias) return canon;
      if (alias.length >= 4 && word.length >= 4 && levenshtein(word, alias) <= 1) {
        return canon;
      }
    }
  }
  return null;
}

export interface AccessorySearchResult {
  id: string;
  name: string;
  forModel: string | null;
  price: number;
  currency: "UZS" | "USD";
  quantity: number;
  tgPhotoFileId: string | null;
  tgVideoFileId: string | null;
  description: string | null;
}

/**
 * Aksesuar qidiruvi: "ayfon 13 pro uchun g'ilof" -> kategoriya (g'ilof) +
 * mos model (iPhone 13 Pro). Kategoriya aytilmasa — nom bo'yicha fuzzy.
 */
export async function searchAccessories(
  rawQuery: string,
  limit = 5
): Promise<AccessorySearchResult[]> {
  const query = normalizeText(rawQuery.replace(/\buchun\b|\bдля\b|\bfor\b/gi, " "));
  if (!query) return [];

  const tokens = query.split(" ").filter(Boolean);
  const categories = new Set<string>();
  const canons = new Set<string>();
  const numbers: string[] = [];
  const words: string[] = [];

  for (const tok of tokens) {
    const cat = canonicalAccessoryCategory(tok);
    if (cat) {
      categories.add(cat);
      continue;
    }
    const canon = canonicalBrand(tok);
    if (canon) {
      canons.add(canon);
      continue;
    }
    if (/^\d+$/.test(tok)) {
      numbers.push(tok);
      continue;
    }
    words.push(tok);
  }

  const items = await prisma.accessory.findMany({
    where: { deletedAt: null, quantity: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const scored: { item: (typeof items)[number]; score: number }[] = [];

  for (const item of items) {
    const nameNorm = normalizeText(item.name);
    const modelNorm = normalizeText(item.forModel ?? "");
    const haystack = `${nameNorm} ${modelNorm}`;
    const hayTokens = haystack.split(" ").filter(Boolean);
    let score = 0;

    // Kategoriya: nom ichida kategoriya aliaslaridan biri bo'lishi kerak
    if (categories.size > 0) {
      let catHit = false;
      for (const cat of categories) {
        const aliases = ACCESSORY_CATEGORIES[cat] ?? [];
        if (aliases.some((a) => haystack.includes(a))) catHit = true;
      }
      if (!catHit) continue;
      score += 5;
    }

    // Brend/model mosligi (forModel yoki nom orqali)
    if (canons.size > 0) {
      const anyCanonHit = Array.from(canons).some((c) => canonMatchesHaystack(c, haystack));
      if (!anyCanonHit) continue;
      score += 4;
    }

    for (const num of numbers) {
      if (haystack.includes(num)) score += 3;
      else if (canons.size > 0) score -= 2; // model raqami mos emas
    }

    for (const word of words) {
      let best = Infinity;
      for (const ht of hayTokens) {
        best = Math.min(best, ht.includes(word) ? 0 : levenshtein(word, ht));
      }
      if (best === 0) score += 2;
      else if (best <= 1) score += 1;
    }

    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ item }) => ({
    id: item.id,
    name: item.name,
    forModel: item.forModel,
    price: Number(item.price),
    currency: item.currency === "USD" ? "USD" : "UZS",
    quantity: item.quantity,
    tgPhotoFileId: item.tgPhotoFileId,
    tgVideoFileId: item.tgVideoFileId,
    description: item.description,
  }));
}

/** Topilmagan qidiruvni jurnalga yozadi (talab tahlili uchun). Hech qachon throw qilmaydi. */
export async function logSearchMiss(query: string, kind: "phone" | "accessory") {
  try {
    await prisma.searchMiss.create({ data: { query: query.slice(0, 200), kind } });
  } catch (error) {
    console.error("[shop-bot] SearchMiss yozilmadi:", error);
  }
}

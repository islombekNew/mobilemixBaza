/**
 * Telefon rasmlarini saqlash — Vercel Blob orqali (CDN'dan tez yuklanadi,
 * baza ichida katta base64 satrlar saqlanib, so'rovlarni sekinlashtirmaydi).
 *
 * Sozlash: Vercel loyiha sozlamalarida "Storage" -> "Blob" yoqilganda,
 * BLOB_READ_WRITE_TOKEN avtomatik environment variable sifatida qo'shiladi —
 * qo'lda hech narsa yozish kerak emas.
 *
 * Agar hali yoqilmagan bo'lsa (lokal dev yoki sozlanmagan production), bu
 * fayldagi funksiyalar xato otmaydi — shunchaki "sozlanmagan" javobini
 * qaytaradi, shu sababli rasm funksiyasi yo'qligi qolgan tizimni
 * to'xtatib qo'ymaydi.
 */

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export interface UploadPhotoResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Telefon rasmini Vercel Blob'ga yuklaydi va ochiq URL qaytaradi. */
export async function uploadPhonePhoto(
  phoneId: string,
  file: File
): Promise<UploadPhotoResult> {
  if (!isBlobStorageConfigured()) {
    return {
      ok: false,
      error:
        "Rasm xizmati sozlanmagan (BLOB_READ_WRITE_TOKEN yo'q). Vercel'da Storage -> Blob'ni yoqing.",
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Faqat JPG, PNG yoki WEBP rasm qabul qilinadi" };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return { ok: false, error: "Rasm hajmi 5 MB'dan oshmasligi kerak" };
  }

  try {
    // Dinamik import — @vercel/blob faqat shu funksiya chaqirilganda
    // kerak, qolgan joylarda (token yo'q paytlarda) butunlay yuklanmaydi.
    const { put } = await import("@vercel/blob");

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const pathname = `phones/${phoneId}-${Date.now()}.${extension}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return { ok: true, url: blob.url };
  } catch (error) {
    console.error("[blob-storage] Yuklashda xatolik:", error);
    return { ok: false, error: "Rasmni yuklashda xatolik yuz berdi" };
  }
}

/** Eski rasmni o'chiradi (almashtirilganda yoki telefon o'chirilganda). */
export async function deletePhonePhoto(url: string): Promise<void> {
  if (!isBlobStorageConfigured()) return;

  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (error) {
    // O'chira olmasak ham davom etamiz — eski rasm Blob'da osilib qolishi
    // funksional jihatdan muhim emas, faqat saqlash joyi sarflanadi.
    console.error("[blob-storage] O'chirishda xatolik:", error);
  }
}

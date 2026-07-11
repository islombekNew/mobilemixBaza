/**
 * Telegram orqali omborga telefon qo'shish (5.3).
 *
 * Admin botga telefon rasmini (yoki kanaldagi postni forward qilib)
 * quyidagi formatdagi izoh (caption) bilan yuboradi:
 *
 *   Apple iPhone 13 128GB Qora 550$ 356789012345671
 *   [ixtiyoriy: yangi/ishlatilgan]  [ixtiyoriy: filial:Chilonzor]
 *
 * Bot: telefonni CRM omboriga qo'shadi, rasmni Vercel Blob'ga yuklaydi
 * (ombordagi rasm muammosi shu yerdan hal bo'ladi) va mijozlarga
 * forward qilsa bo'ladigan karta-xabar qaytaradi.
 */

import prisma from "@/lib/prisma";
import { getSystemOwnerUser } from "@/lib/access-control";
import { createPhone } from "@/lib/phones";
import { uploadPhonePhoto, isBlobStorageConfigured } from "@/lib/blob-storage";
import { escapeHtml, formatMoneyTg } from "@/lib/telegram";
import { getUsdRate } from "@/lib/exchange-rate";
import type { Currency, PhoneCondition } from "@prisma/client";

const FORMAT_HELP =
  `Rasm izohi (caption) quyidagi formatda bo'lishi kerak:\n\n` +
  `<code>Brend Model Xotira Rang Narx IMEI</code>\n\n` +
  `Masalan:\n` +
  `<code>Apple iPhone 13 128GB Qora 550$ 356789012345671</code>\n` +
  `<code>Samsung S23 Ultra 256GB Oq 9500000 356789012345672</code>\n\n` +
  `Qo'shimcha (ixtiyoriy): <code>yangi</code> yoki <code>ishlatilgan</code>, ` +
  `<code>filial:Nomi</code>\n` +
  `Narx oxirida $ bo'lsa dollar, bo'lmasa so'm deb olinadi.`;

interface ParsedPhone {
  brand: string;
  model: string;
  color: string;
  storageGB: number;
  imei: string;
  salePrice: number;
  currency: Currency;
  condition: PhoneCondition;
  branchName?: string;
}

/** Caption matnini telefon maydonlariga ajratadi. Xatoda izohli string. */
export function parsePhoneCaption(caption: string): ParsedPhone | { error: string } {
  const tokens = caption.trim().split(/\s+/);
  if (tokens.length < 4) {
    return { error: `Ma'lumot yetarli emas.\n\n${FORMAT_HELP}` };
  }

  let imei: string | undefined;
  let storageGB: number | undefined;
  let salePrice: number | undefined;
  let currency: Currency = "UZS";
  let condition: PhoneCondition = "NEW";
  let branchName: string | undefined;
  const rest: string[] = [];

  for (const raw of tokens) {
    const t = raw.trim();
    const lower = t.toLowerCase();

    if (/^\d{15}$/.test(t)) {
      imei = t;
    } else if (/^\d+\s?gb$/i.test(t)) {
      storageGB = parseInt(t, 10);
    } else if (lower.startsWith("filial:")) {
      branchName = t.slice("filial:".length).trim();
    } else if (["yangi", "new"].includes(lower)) {
      condition = "NEW";
    } else if (["ishlatilgan", "used", "b/u", "б/у"].includes(lower)) {
      condition = "USED";
    } else if (/^\$?[\d][\d.,\s]*\$?$/.test(t) && salePrice === undefined) {
      const isUsd = t.includes("$");
      // So'mda nuqta/vergul minglik ajratkich ("6.500.000"), dollarda esa
      // kasr bo'lishi mumkin ("$549.99") — dollarda butun qismini olamiz.
      const num = isUsd
        ? Math.floor(Number(t.replace(/[$,\s]/g, "")))
        : Number(t.replace(/[.,\s]/g, ""));
      if (Number.isFinite(num) && num > 0) {
        salePrice = num;
        currency = isUsd ? "USD" : "UZS";
      }
    } else {
      rest.push(t);
    }
  }

  if (!imei) return { error: `IMEI topilmadi (15 xonali raqam kerak).\n\n${FORMAT_HELP}` };
  if (!storageGB) return { error: `Xotira hajmi topilmadi (masalan 128GB).\n\n${FORMAT_HELP}` };
  if (!salePrice) return { error: `Narx topilmadi.\n\n${FORMAT_HELP}` };
  if (rest.length < 2) {
    return { error: `Brend va model topilmadi.\n\n${FORMAT_HELP}` };
  }

  const brand = rest[0];
  // Kamida 3 ta so'z qolsa oxirgisi rang, aks holda rang ko'rsatilmagan
  const color = rest.length >= 3 ? rest[rest.length - 1] : "Ko'rsatilmagan";
  const model = (rest.length >= 3 ? rest.slice(1, -1) : rest.slice(1)).join(" ");

  return { brand, model, color, storageGB, imei, salePrice, currency, condition, branchName };
}

/**
 * Telegram'dagi eng katta rasmni yuklab olib, File qilib qaytaradi.
 * botToken berilmasa admin boti tokeni ishlatiladi (mijoz boti o'z
 * tokenini uzatadi — file_id'lar botga bog'liq).
 */
export async function downloadTelegramPhoto(
  fileId: string,
  botToken?: string
): Promise<File | null> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const fileData = await fileRes.json();
    const filePath: string | undefined = fileData?.result?.file_path;
    if (!fileData?.ok || !filePath) return null;

    const photoRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!photoRes.ok) return null;

    const buffer = await photoRes.arrayBuffer();
    const isPng = filePath.toLowerCase().endsWith(".png");
    return new File([buffer], `telegram.${isPng ? "png" : "jpg"}`, {
      type: isPng ? "image/png" : "image/jpeg",
    });
  } catch (error) {
    console.error("[telegram-inbox] Rasmni yuklab olishda xatolik:", error);
    return null;
  }
}

export interface InboxPhotoMessage {
  caption?: string;
  // Telegram PhotoSize[] — oxirgisi eng katta o'lcham
  photo?: { file_id: string }[];
}

export interface InboxResult {
  reply: string;
  /** Mijozlarga forward qilish uchun alohida karta-xabar (bo'lsa) */
  customerCard?: string;
}

/**
 * Admin yuborgan rasm+izoh xabarini qayta ishlaydi: telefonni omborga
 * qo'shadi, rasmni biriktiradi, javob matnlarini qaytaradi.
 */
export async function handleInboxPhoto(message: InboxPhotoMessage): Promise<InboxResult> {
  const caption = message.caption?.trim();
  if (!caption) {
    return { reply: `📸 Rasm qabul qilindi, lekin izoh (caption) yo'q.\n\n${FORMAT_HELP}` };
  }

  const parsed = parsePhoneCaption(caption);
  if ("error" in parsed) {
    return { reply: `❌ ${parsed.error}` };
  }

  // Filial: nomi ko'rsatilgan bo'lsa shu, aks holda birinchi filial
  const branch = parsed.branchName
    ? await prisma.branch.findFirst({
        where: { name: { contains: parsed.branchName, mode: "insensitive" } },
      })
    : await prisma.branch.findFirst({ orderBy: { createdAt: "asc" } });

  if (!branch) {
    return {
      reply: parsed.branchName
        ? `❌ "${escapeHtml(parsed.branchName)}" nomli filial topilmadi.`
        : "❌ Tizimda hali filial yo'q — avval CRM'da filial qo'shing.",
    };
  }

  const owner = await getSystemOwnerUser();

  let phone;
  try {
    phone = await createPhone(owner, {
      brand: parsed.brand,
      model: parsed.model,
      color: parsed.color,
      storageGB: parsed.storageGB,
      imei: parsed.imei,
      condition: parsed.condition,
      costPrice: 0, // tan narx keyin CRM'da tahrirlanadi
      salePrice: parsed.salePrice,
      currency: parsed.currency,
      branchId: branch.id,
    });
  } catch (error) {
    return {
      reply: `❌ ${escapeHtml(error instanceof Error ? error.message : "Telefonni qo'shishda xatolik")}`,
    };
  }

  // Rasmni biriktirish (eng katta o'lchamdagisini olamiz)
  let photoNote = "";
  const largest = message.photo?.[message.photo.length - 1];
  if (largest && isBlobStorageConfigured()) {
    const file = await downloadTelegramPhoto(largest.file_id);
    if (file) {
      const uploaded = await uploadPhonePhoto(phone.id, file);
      if (uploaded.ok && uploaded.url) {
        await prisma.phone.update({
          where: { id: phone.id },
          data: { photoUrl: uploaded.url },
        });
        photoNote = "🖼 Rasm ham biriktirildi.";
      } else {
        photoNote = "⚠️ Rasm yuklanmadi (telefon rasmsiz qo'shildi).";
      }
    } else {
      photoNote = "⚠️ Rasmni yuklab olib bo'lmadi (telefon rasmsiz qo'shildi).";
    }
  } else if (largest) {
    photoNote = "⚠️ Rasm saqlash xizmati sozlanmagan (BLOB_READ_WRITE_TOKEN).";
  }

  const usdRate = await getUsdRate();
  const approx =
    parsed.currency === "USD"
      ? ` (≈ ${formatMoneyTg(parsed.salePrice * usdRate, "UZS")})`
      : ` (≈ ${formatMoneyTg(parsed.salePrice / usdRate, "USD")})`;

  const title = `${parsed.brand} ${parsed.model}`;
  const conditionLabel = parsed.condition === "NEW" ? "Yangi" : "Ishlatilgan";

  const reply =
    `✅ <b>Omborga qo'shildi!</b>\n\n` +
    `📱 ${escapeHtml(title)} (${parsed.storageGB}GB, ${escapeHtml(parsed.color)})\n` +
    `📋 Holati: ${conditionLabel}\n` +
    `💰 Narxi: ${formatMoneyTg(parsed.salePrice, parsed.currency)}${approx}\n` +
    `🔢 IMEI: <code>${parsed.imei}</code>\n` +
    `🏢 Filial: ${escapeHtml(branch.name)}\n` +
    (photoNote ? `${photoNote}\n` : "") +
    `\nPastdagi kartani mijozlarga forward qilishingiz mumkin 👇`;

  const customerCard =
    `📱 <b>${escapeHtml(title)}</b>\n\n` +
    `💾 Xotira: ${parsed.storageGB}GB\n` +
    `🎨 Rang: ${escapeHtml(parsed.color)}\n` +
    `📋 Holati: ${conditionLabel}\n` +
    `💰 Narxi: <b>${formatMoneyTg(parsed.salePrice, parsed.currency)}</b>${approx}\n\n` +
    `📞 Buyurtma uchun bizga yozing!`;

  return { reply, customerCard };
}

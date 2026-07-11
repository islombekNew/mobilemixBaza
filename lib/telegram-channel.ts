/**
 * Do'kon Telegram kanaliga avtomatik "sotildi" postlari (5.2).
 *
 * Qoida: har 5 ta yangi sotuv yig'ilganda kanalga bitta post chiqadi —
 * "Bu telefonlar shu narxlarda sotildi" ro'yxati bilan. Post qilingan
 * sotuvlar `postedToChannel` bilan belgilanadi, shu sababli bir sotuv
 * ikki marta post bo'lmaydi.
 *
 * Admin xohlasa /kanalga buyrug'i bilan 5 taga yetmasdan ham qo'lda
 * post qildira oladi (lib/telegram-bot.ts).
 *
 * Sozlash: TELEGRAM_CHANNEL_ID (masalan @mixmobile_kanal yoki -100123...).
 * Sozlanmagan bo'lsa funksiya jim o'tkazib yuboradi — CRM ishlayveradi.
 */

import prisma from "@/lib/prisma";
import { sendTelegramMessage, escapeHtml, formatMoneyTg, formatDate } from "@/lib/telegram";

const BATCH_SIZE = 5;

function getChannelId(): string | undefined {
  const id = process.env.TELEGRAM_CHANNEL_ID?.trim();
  return id || undefined;
}

export function isChannelConfigured(): boolean {
  return Boolean(getChannelId() && process.env.TELEGRAM_BOT_TOKEN);
}

/** Hali kanalga chiqarilmagan sotuvlar soni. */
export async function countPendingChannelSales(): Promise<number> {
  return prisma.sale.count({ where: { postedToChannel: false, returnedAt: null } });
}

/**
 * Kanalga chiqarilmagan sotuvlarni post qiladi va belgilaydi.
 * @param force true — 5 taga yetmagan bo'lsa ham post qilinadi (qo'lda buyruq)
 * @returns post qilingan sotuvlar soni (0 — hech narsa chiqmadi)
 */
export async function postSoldPhonesToChannel(force = false): Promise<number> {
  const channelId = getChannelId();
  if (!channelId) return 0;

  const pending = await prisma.sale.findMany({
    where: { postedToChannel: false, returnedAt: null },
    orderBy: { saleDate: "asc" },
    take: 20, // bitta postga sig'adigan oqilona chegara
    select: {
      id: true,
      finalPrice: true,
      currency: true,
      saleDate: true,
      phone: { select: { brand: true, model: true, storageGB: true, color: true } },
    },
  });

  if (pending.length === 0) return 0;
  if (!force && pending.length < BATCH_SIZE) return 0;

  const lines = pending.map((s, i) => {
    const p = s.phone;
    return (
      `${i + 1}. 📱 <b>${escapeHtml(`${p.brand} ${p.model}`)}</b> ` +
      `(${p.storageGB}GB, ${escapeHtml(p.color)})\n` +
      `    💰 ${formatMoneyTg(Number(s.finalPrice), s.currency)} — ${formatDate(s.saleDate)}`
    );
  });

  const text =
    `🔥 <b>SOTILDI!</b>\n\n` +
    `Quyidagi telefonlar shu narxlarda o'z egalarini topdi:\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `📞 Sizga ham kerakmi? Bizga yozing!`;

  const result = await sendTelegramMessage(text, { chatId: channelId });
  if (!result.ok) return 0;

  await prisma.sale.updateMany({
    where: { id: { in: pending.map((s) => s.id) } },
    data: { postedToChannel: true },
  });

  return pending.length;
}

/**
 * Har sotuvdan keyin chaqiriladi (lib/sales.ts): 5 ta yig'ilgan bo'lsa
 * avtomatik post. Hech qachon throw qilmaydi.
 */
export async function maybePostSoldBatch(): Promise<void> {
  try {
    if (!isChannelConfigured()) return;
    const pendingCount = await countPendingChannelSales();
    if (pendingCount >= BATCH_SIZE) {
      await postSoldPhonesToChannel();
    }
  } catch (error) {
    console.error("[telegram-channel] Kanal postida xatolik:", error);
  }
}

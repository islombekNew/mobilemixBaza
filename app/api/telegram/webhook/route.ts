import { NextRequest, NextResponse } from "next/server";
import { replyToChat } from "@/lib/telegram";
import { handleTelegramCommand } from "@/lib/telegram-bot";

/**
 * Telegram webhook endpoint.
 *
 * Xavfsizlik ikki qatlamda:
 *  1) `X-Telegram-Bot-Api-Secret-Token` header — faqat Telegram'ning o'zi
 *     (setWebhook'da bergan secret_token bilan) shu headerni to'g'ri
 *     yuborishi mumkin. scripts/setup-telegram-webhook.ts shu sirni
 *     ro'yxatdan o'tkazadi.
 *  2) Kelgan xabarning chat.id'si TELEGRAM_ADMIN_CHAT_ID bilan solishtiriladi
 *     — boshqa hech kim (sir oqib ketgan taqdirda ham) bot orqali biznes
 *     ma'lumotlarini ko'ra olmaydi, chunki javob faqat admin chatiga ketadi.
 *
 * Telegram har doim 200 OK kutadi (aks holda qayta-qayta urinib, keraksiz
 * trafik yaratadi) — shuning uchun ichki xatoliklar ham 200 bilan qaytariladi,
 * faqat konsolga yoziladi.
 */
export async function POST(request: NextRequest) {
  const secretFromTelegram = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret || secretFromTelegram !== expectedSecret) {
    // Sir mos kelmasa — bu Telegram'dan emas. Hech narsa oshkor qilmasdan rad etamiz.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = (update as Record<string, unknown>)?.message as
    | { chat?: { id?: number | string }; text?: string }
    | undefined;

  const chatId = message?.chat?.id;
  const text = message?.text;

  if (chatId === undefined || !text) {
    // Buyruq emas (masalan, rasm, sticker) — e'tiborsiz qoldiramiz.
    return NextResponse.json({ ok: true });
  }

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId || String(chatId) !== adminChatId) {
    // Admin bo'lmagan birov botni topib yozsa — hech qanday ma'lumot
    // bermasdan jim qolamiz (xato xabari ham ma'lumot oqishi mumkin).
    return NextResponse.json({ ok: true });
  }

  try {
    const responseText = await handleTelegramCommand(text);
    await replyToChat(String(chatId), responseText);
  } catch (error) {
    console.error("[telegram-webhook] Xatolik:", error);
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { replyToChat, getAdminChatIds } from "@/lib/telegram";
import {
  handleTelegramCommand,
  buildInventorySearchReply,
  CUSTOMER_GREETING,
} from "@/lib/telegram-bot";
import { handleInboxPhoto } from "@/lib/telegram-inbox";

/**
 * Telegram webhook endpoint.
 *
 * Xavfsizlik:
 *  1) `X-Telegram-Bot-Api-Secret-Token` header — faqat Telegram'ning o'zi
 *     (setWebhook'da bergan secret_token bilan) shu headerni to'g'ri
 *     yuborishi mumkin (scripts/setup-telegram-webhook.ts).
 *  2) Rollar chat.id bo'yicha ajratiladi:
 *     - ADMIN (TELEGRAM_ADMIN_CHAT_ID ro'yxatidagilar): barcha buyruqlar,
 *       hisobotlar, rasm forward orqali telefon qo'shish (5.3).
 *     - MIJOZ (qolgan hamma): faqat SEKRETAR rejimi (5.4) — ombor
 *       qidiruvi (bor/yo'q + narx). Hech qanday ichki biznes ma'lumot
 *       (foyda, qarzlar, filiallar) mijozga ochilmaydi.
 *
 * Telegram har doim 200 OK kutadi — ichki xatoliklar ham 200 bilan
 * qaytariladi, faqat konsolga yoziladi.
 */
export async function POST(request: NextRequest) {
  const secretFromTelegram = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret || secretFromTelegram !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = (update as Record<string, unknown>)?.message as
    | {
        chat?: { id?: number | string; type?: string };
        text?: string;
        caption?: string;
        photo?: { file_id: string }[];
      }
    | undefined;

  const chatId = message?.chat?.id;
  if (chatId === undefined) {
    return NextResponse.json({ ok: true });
  }

  // Faqat shaxsiy chatlarda javob beramiz — guruh/kanalga qo'shilsa jim turadi
  if (message?.chat?.type && message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const isAdmin = getAdminChatIds().includes(String(chatId));

  try {
    // 5.3: Admin rasm (forward) yuborsa — omborga telefon qo'shish
    if (isAdmin && message?.photo?.length) {
      const result = await handleInboxPhoto({
        caption: message.caption,
        photo: message.photo,
      });
      await replyToChat(String(chatId), result.reply);
      if (result.customerCard) {
        await replyToChat(String(chatId), result.customerCard);
      }
      return NextResponse.json({ ok: true });
    }

    const text = message?.text?.trim();
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    if (isAdmin) {
      // Admin: to'liq buyruqlar + erkin matnda ombor qidiruvi
      const responseText = await handleTelegramCommand(text);
      await replyToChat(String(chatId), responseText);
    } else {
      // 5.4: Mijoz — faqat sekretar rejimi (AI'siz ombor qidiruvi)
      const responseText = text.startsWith("/")
        ? CUSTOMER_GREETING
        : await buildInventorySearchReply(text);
      await replyToChat(String(chatId), responseText);
    }
  } catch (error) {
    console.error("[telegram-webhook] Xatolik:", error);
  }

  return NextResponse.json({ ok: true });
}

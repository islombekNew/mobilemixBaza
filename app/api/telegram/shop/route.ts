import { NextRequest, NextResponse } from "next/server";
import { handleShopUpdate, type ShopUpdate } from "@/lib/shop-bot/handler";

/**
 * Mijozlar uchun do'kon boti (@istaganingniOl_bot) webhook endpoint'i.
 *
 * Xavfsizlik: `X-Telegram-Bot-Api-Secret-Token` header —
 * TELEGRAM_SHOP_WEBHOOK_SECRET bilan tekshiriladi (setWebhook'da o'rnatiladi).
 *
 * Telegram har doim 200 OK kutadi — ichki xatoliklar ham 200 bilan
 * qaytariladi, faqat konsolga yoziladi (aks holda Telegram qayta-qayta
 * yuboraveradi).
 */
export async function POST(request: NextRequest) {
  const secretFromTelegram = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_SHOP_WEBHOOK_SECRET;

  if (!expectedSecret || secretFromTelegram !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: ShopUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleShopUpdate(update);
  } catch (error) {
    console.error("[shop-webhook] Xatolik:", error);
  }

  return NextResponse.json({ ok: true });
}

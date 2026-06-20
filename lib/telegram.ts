/**
 * Telegram Bot API bilan ishlash uchun past darajadagi (low-level) klient.
 *
 * Xavfsizlik eslatmasi: TELEGRAM_BOT_TOKEN va TELEGRAM_ADMIN_CHAT_ID hech
 * qachon kod ichida yozilmaydi — faqat .env orqali o'qiladi (.env esa
 * .gitignore'da bloklangan). Shu fayl ESLAR doim shu qoidaga amal qiladi.
 *
 * Bildirishnoma yuborish hech qachon asosiy biznes-amalni (sotuv, to'lov,
 * ombor yangilanishi) to'xtatib qo'ymasligi kerak — shuning uchun bu fayldagi
 * funksiyalar hech qachon `throw` qilmaydi, faqat natijani { ok, error }
 * shaklida qaytaradi va xatoni konsolga yozadi.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; skipped?: true; error?: string };

function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

/** Bot to'liq sozlanganmi (token + admin chat id) — shartli logikada ishlatiladi. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}

/**
 * HTML parse_mode ishlatilganda foydalanuvchi kiritgan matnda (mijoz ismi,
 * model nomi va h.k.) `<`, `>`, `&` belgilari bo'lib qolishi Telegram API
 * xatosiga yoki noto'g'ri formatlanishga olib kelishi mumkin — shu uchun
 * har doim escape qilingan holda joylashtiriladi.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Pul summasini "1 250 000 so'm" ko'rinishida formatlaydi. */
export function formatSum(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("uz-UZ").replace(/,/g, " ")} so'm`;
}

/** Sanani "20.06.2026" ko'rinishida formatlaydi (Toshkent vaqti). */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

interface SendMessageOptions {
  chatId?: string;
  parseMode?: "HTML" | "MarkdownV2";
  disableNotification?: boolean;
}

/**
 * Telegram orqali xabar yuboradi. Token yoki chat id yo'q bo'lsa
 * (masalan, lokal dev muhitida sozlanmagan bo'lsa), shunchaki o'tkazib
 * yuboradi — ilova ishlashda davom etadi.
 */
export async function sendTelegramMessage(
  text: string,
  options: SendMessageOptions = {}
): Promise<TelegramSendResult> {
  const token = getBotToken();
  const chatId = options.chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_CHAT_ID sozlanmagan — xabar yuborilmadi."
    );
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
        disable_web_page_preview: true,
        disable_notification: options.disableNotification ?? false,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("[telegram] Xabar yuborilmadi:", data.description ?? response.statusText);
      return { ok: false, error: data.description ?? "Noma'lum xatolik" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[telegram] So'rovda xatolik:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Bot orqali aniq bir chat'ga javob yuborish (webhook handler uchun).
 * sendTelegramMessage'dan farqi — chatId majburiy parametr.
 */
export async function replyToChat(chatId: string, text: string): Promise<TelegramSendResult> {
  return sendTelegramMessage(text, { chatId });
}

/** setWebhook chaqirig'ini bajaradi — scripts/setup-telegram-webhook.ts shu funksiyani ishlatadi. */
export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const token = getBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN .env'da topilmadi");
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      // Faqat oddiy matnli xabarlarni qabul qilamiz — boshqa update turlari
      // (masalan, edited_message) hozircha kerak emas.
      allowed_updates: ["message"],
    }),
  });

  const data = await response.json();
  return { ok: Boolean(data.ok), description: data.description };
}

/**
 * Mijozlar do'kon boti (@istaganingniOl_bot) uchun webhook o'rnatish.
 * Deploy'dan keyin bir marta ishga tushiriladi:
 *
 *   WEBHOOK_URL="https://sizning-domain.vercel.app/api/telegram/shop" \
 *     npm run telegram:setup-shop-webhook
 *
 * TELEGRAM_SHOP_BOT_TOKEN va TELEGRAM_SHOP_WEBHOOK_SECRET .env'dan o'qiladi —
 * Vercel'da ham AYNAN shu qiymatlar o'rnatilgan bo'lishi shart.
 */
import { setTelegramWebhook } from "../lib/telegram";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

async function main() {
  const webhookUrl = process.env.WEBHOOK_URL;
  const token = process.env.TELEGRAM_SHOP_BOT_TOKEN;
  const secret = process.env.TELEGRAM_SHOP_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.error(
      '❌ WEBHOOK_URL kerak. Masalan:\n   WEBHOOK_URL="https://sizning-domain.vercel.app/api/telegram/shop" npm run telegram:setup-shop-webhook'
    );
    process.exit(1);
  }
  if (!token || !secret) {
    console.error("❌ TELEGRAM_SHOP_BOT_TOKEN yoki TELEGRAM_SHOP_WEBHOOK_SECRET .env'da topilmadi.");
    process.exit(1);
  }

  console.log(`🔗 Do'kon boti webhook o'rnatilmoqda: ${webhookUrl}`);

  const result = await setTelegramWebhook(webhookUrl, secret, {
    token,
    // Inline "Buyurtma berish" tugmasi uchun callback_query ham kerak
    allowedUpdates: ["message", "callback_query"],
  });

  if (result.ok) {
    console.log("✅ Webhook o'rnatildi. Botga /start yozib sinab ko'ring.");
  } else {
    console.error("❌ Webhook o'rnatilmadi:", result.description);
    process.exit(1);
  }
}

main();

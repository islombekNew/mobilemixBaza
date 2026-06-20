/**
 * Bir martalik skript: Telegram'ga "har bir xabarni shu URL'ga yuborib tur"
 * deb buyruq beradi (setWebhook). Loyiha Vercel'ga deploy qilingandan
 * KEYIN, bir marta ishga tushiriladi:
 *
 *   WEBHOOK_URL="https://sizning-domain.vercel.app/api/telegram/webhook" \
 *     npm run telegram:setup-webhook
 *
 * TELEGRAM_BOT_TOKEN va TELEGRAM_WEBHOOK_SECRET .env faylidan o'qiladi —
 * shu ikkisi mos bo'lishi uchun production muhitida (Vercel) ham AYNAN
 * shu qiymatlar o'rnatilganligiga ishonch hosil qiling.
 */
import { setTelegramWebhook } from "../lib/telegram";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Loyihada `dotenv` paketi yo'q (kerak emas — Next.js o'zi .env'ni
 * avtomatik o'qiydi), shuning uchun bu sodda skript uchun .env'ni
 * qo'lda, qo'shimcha bog'liqliksiz o'qiymiz. Faqat KEY="VALUE" yoki
 * KEY=VALUE formatini tushunadi, izoh (#) qatorlarini o'tkazib yuboradi.
 */
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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

async function main() {
  const webhookUrl = process.env.WEBHOOK_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.error(
      '❌ WEBHOOK_URL kerak. Masalan:\n   WEBHOOK_URL="https://mix-mobile.vercel.app/api/telegram/webhook" npm run telegram:setup-webhook'
    );
    process.exit(1);
  }

  if (!secret) {
    console.error("❌ TELEGRAM_WEBHOOK_SECRET .env faylida topilmadi.");
    process.exit(1);
  }

  console.log(`🔗 Webhook o'rnatilmoqda: ${webhookUrl}`);

  const result = await setTelegramWebhook(webhookUrl, secret);

  if (result.ok) {
    console.log("✅ Webhook muvaffaqiyatli o'rnatildi. Botga /yordam yozib sinab ko'ring.");
  } else {
    console.error("❌ Webhook o'rnatilmadi:", result.description);
    process.exit(1);
  }
}

main();

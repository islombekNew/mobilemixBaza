/**
 * Telegram bot buyruqlarini ishlovchi mantiq. Webhook route handler
 * (app/api/telegram/webhook/route.ts) shu faylga matnni uzatadi, bu fayl
 * esa tegishli ma'lumotni yig'ib, tayyor javob matnini qaytaradi.
 *
 * Bu yerda hech qanday Telegram-specific kod yo'q (sendMessage va h.k.) —
 * faqat "qaysi buyruqqa qaysi ma'lumot" mantiqi. Bu ajratish webhook route
 * handler'ni soddaligicha saqlaydi va bot mantiqini alohida sinash imkonini
 * beradi.
 */

import { getSystemOwnerUser } from "@/lib/access-control";
import { compareBranches, getDailySummaryAllBranches } from "@/lib/reports";
import { getAllOverdueCustomers } from "@/lib/customers";
import { escapeHtml, formatSum, formatDate } from "@/lib/telegram";

const HELP_TEXT =
  `🤖 <b>Mix Mobile bot</b>\n\n` +
  `Buyruqlar:\n` +
  `/holat — shu oy bo'yicha filiallar holati\n` +
  `/bugun — bugungi sotuvlar (har filial)\n` +
  `/qarzlar — muddati o'tgan qarzlar ro'yxati\n` +
  `/yordam — shu xabar`;

async function buildHolatReport(): Promise<string> {
  const owner = await getSystemOwnerUser();
  const rows = await compareBranches(owner);

  if (rows.length === 0) return "Hozircha hech qanday filial yo'q.";

  const lines = rows.map((r) => {
    return (
      `🏢 <b>${escapeHtml(r.branchName)}</b>\n` +
      `   Omborda: ${r.inStockCount} dona\n` +
      `   Shu oy sotildi: ${r.salesCount} dona\n` +
      `   Tushum: ${formatSum(r.revenue)}\n` +
      `   Foyda: ${formatSum(r.profit)}`
    );
  });

  return `📊 <b>Filiallar holati (shu oy)</b>\n\n${lines.join("\n\n")}`;
}

async function buildBugunReport(): Promise<string> {
  const owner = await getSystemOwnerUser();
  const stats = await getDailySummaryAllBranches(owner);

  if (stats.length === 0) return "Hozircha hech qanday filial yo'q.";

  const lines = stats.map((s) => {
    return (
      `🏢 <b>${escapeHtml(s.branchName)}</b>\n` +
      `   Omborda: ${s.inStockCount} dona\n` +
      `   Bugun sotildi: ${s.soldCount} dona\n` +
      `   Tushum: ${formatSum(s.revenueTotal)}\n` +
      `   Foyda: ${formatSum(s.profitTotal)}`
    );
  });

  return `📅 <b>Bugungi hisobot — ${formatDate(new Date())}</b>\n\n${lines.join("\n\n")}`;
}

async function buildQarzlarReport(): Promise<string> {
  const owner = await getSystemOwnerUser();
  const overdue = await getAllOverdueCustomers(owner);

  if (overdue.length === 0) {
    return "✅ Hozircha muddati o'tgan qarzlar yo'q.";
  }

  const lines = overdue.slice(0, 20).map((c) => {
    const remaining = Number(c.totalAmount) - Number(c.paidAmount);
    return (
      `👤 <b>${escapeHtml(c.fullName)}</b> (${escapeHtml(c.phoneNumber)})\n` +
      `   Filial: ${escapeHtml(c.sale.branch.name)}\n` +
      `   Qarz: ${formatSum(remaining)}\n` +
      `   Muddat: ${formatDate(c.dueDate)}`
    );
  });

  const moreNote =
    overdue.length > 20 ? `\n\n... va yana ${overdue.length - 20} ta mijoz.` : "";

  return (
    `⚠️ <b>Muddati o'tgan qarzlar (${overdue.length})</b>\n\n` +
    lines.join("\n\n") +
    moreNote
  );
}

/**
 * Kelgan matnli buyruqni ishlab, javob matnini qaytaradi.
 * Noma'lum buyruq bo'lsa, yordam xabarini qaytaradi.
 */
export async function handleTelegramCommand(rawText: string): Promise<string> {
  const text = rawText.trim().toLowerCase();
  const command = text.split(/\s+/)[0];

  try {
    switch (command) {
      case "/start":
      case "/yordam":
      case "/help":
        return HELP_TEXT;
      case "/holat":
        return await buildHolatReport();
      case "/bugun":
        return await buildBugunReport();
      case "/qarzlar":
        return await buildQarzlarReport();
      default:
        return `Buyruq tushunilmadi. 👇\n\n${HELP_TEXT}`;
    }
  } catch (error) {
    console.error("[telegram-bot] Buyruqni qayta ishlashda xatolik:", error);
    return "❌ Ma'lumotlarni olishda xatolik yuz berdi. Birozdan keyin urinib ko'ring.";
  }
}

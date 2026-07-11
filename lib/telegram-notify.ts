/**
 * Biznes voqealariga mos Telegram bildirishnomalarini shakllantiradi va
 * yuboradi. Past darajadagi yuborish mantiqi lib/telegram.ts'da,
 * bu fayl esa "qanday voqeada qanday xabar" qoidalarini saqlaydi.
 *
 * MUHIM: bu fayldagi funksiyalar HECH QACHON xatolikni yuqoriga otmaydi
 * (throw qilmaydi) — chaqiruvchi joyda .catch() bilan ishlatish kifoya,
 * lekin xavfsizlik uchun bu yerning o'zida ham try/catch bor.
 */

import { sendTelegramMessage, escapeHtml, formatSum, formatMoneyTg, formatDate } from "@/lib/telegram";

interface OverdueCustomerInfo {
  fullName: string;
  phoneNumber: string;
  remainingDebt: number;
  currency?: "UZS" | "USD";
  dueDate: Date;
  branchName: string;
}

/** Muddati o'tib ketgan (yangi OVERDUE bo'lgan) mijozlar haqida xabar. */
export async function notifyNewOverdueCustomers(customers: OverdueCustomerInfo[]) {
  if (customers.length === 0) return;

  try {
    const lines = customers
      .map((c) => {
        return (
          `👤 <b>${escapeHtml(c.fullName)}</b> (${escapeHtml(c.phoneNumber)})\n` +
          `   Filial: ${escapeHtml(c.branchName)}\n` +
          `   Qarz: ${formatMoneyTg(c.remainingDebt, c.currency ?? "UZS")}\n` +
          `   Muddat o'tdi: ${formatDate(c.dueDate)}`
        );
      })
      .join("\n\n");

    const text =
      `⚠️ <b>Muddati o'tgan qarzlar (${customers.length})</b>\n\n${lines}`;

    await sendTelegramMessage(text);
  } catch (error) {
    console.error("[telegram-notify] Muddati o'tgan qarz xabari yuborilmadi:", error);
  }
}

interface DebtReminderCustomer {
  fullName: string;
  phoneNumber: string;
  remainingDebt: number;
  currency?: "UZS" | "USD";
  dueDate: Date;
  branchName: string;
}

/**
 * Har kunlik qarz eslatmasi — to'lov muddati BUGUN kelgan va muddati
 * O'TGAN mijozlar bitta xabarda, barcha admin(lar)ga yuboriladi.
 * Cron (api/cron/check-overdue) har kuni ertalab chaqiradi.
 */
export async function notifyDebtReminders(
  dueToday: DebtReminderCustomer[],
  overdue: DebtReminderCustomer[]
) {
  if (dueToday.length === 0 && overdue.length === 0) return;

  try {
    const line = (c: DebtReminderCustomer) =>
      `👤 <b>${escapeHtml(c.fullName)}</b> (${escapeHtml(c.phoneNumber)})\n` +
      `   Filial: ${escapeHtml(c.branchName)}\n` +
      `   Qolgan summa: ${formatMoneyTg(c.remainingDebt, c.currency ?? "UZS")}\n` +
      `   Muddat: ${formatDate(c.dueDate)}`;

    const sections: string[] = [];

    if (dueToday.length > 0) {
      sections.push(
        `📅 <b>Bugun to'lov muddati kelganlar (${dueToday.length})</b>\n\n` +
          dueToday.map(line).join("\n\n")
      );
    }

    if (overdue.length > 0) {
      const shown = overdue.slice(0, 15);
      const moreNote =
        overdue.length > 15 ? `\n\n... va yana ${overdue.length - 15} ta mijoz.` : "";
      sections.push(
        `⚠️ <b>Muddati o'tganlar (${overdue.length})</b>\n\n` +
          shown.map(line).join("\n\n") +
          moreNote
      );
    }

    const text = `🔔 <b>Qarz eslatmasi</b>\n\n${sections.join("\n\n———\n\n")}`;

    await sendTelegramMessage(text);
  } catch (error) {
    console.error("[telegram-notify] Qarz eslatmasi yuborilmadi:", error);
  }
}

interface CreditSaleInfo {
  customerName: string;
  customerPhone: string;
  phoneModel: string;
  totalAmount: number;
  initialPayment: number;
  currency?: "UZS" | "USD";
  dueDate: Date;
  branchName: string;
  sellerName: string;
}

/** Kreditga (bo'lib to'lashga) yangi sotuv qilinganda admin xabardor bo'ladi. */
export async function notifyCreditSale(info: CreditSaleInfo) {
  try {
    const remaining = info.totalAmount - info.initialPayment;
    const cur = info.currency ?? "UZS";
    const text =
      `🧾 <b>Yangi kredit sotuv</b>\n\n` +
      `📱 ${escapeHtml(info.phoneModel)}\n` +
      `🏢 Filial: ${escapeHtml(info.branchName)}\n` +
      `🧑‍💼 Sotuvchi: ${escapeHtml(info.sellerName)}\n` +
      `👤 Mijoz: ${escapeHtml(info.customerName)} (${escapeHtml(info.customerPhone)})\n` +
      `💰 Umumiy: ${formatMoneyTg(info.totalAmount, cur)}\n` +
      `💵 Boshlang'ich to'lov: ${formatMoneyTg(info.initialPayment, cur)}\n` +
      `📌 Qolgan qarz: ${formatMoneyTg(remaining, cur)}\n` +
      `📅 To'lov muddati: ${formatDate(info.dueDate)}`;

    await sendTelegramMessage(text);
  } catch (error) {
    console.error("[telegram-notify] Kredit sotuv xabari yuborilmadi:", error);
  }
}

/** Xavfsizlik nuqtai nazaridan muhim amallar (telefon o'chirish va h.k.) haqida qisqa xabar. */
export async function notifySecurityEvent(title: string, detailsLines: string[]) {
  try {
    const text =
      `🔐 <b>${escapeHtml(title)}</b>\n\n` +
      detailsLines.map((line) => escapeHtml(line)).join("\n");

    await sendTelegramMessage(text, { disableNotification: true });
  } catch (error) {
    console.error("[telegram-notify] Xavfsizlik xabari yuborilmadi:", error);
  }
}

interface BranchDailyStat {
  branchName: string;
  inStockCount: number;
  soldCount: number;
  revenueTotal: number;
  profitTotal: number;
}

/** Har kunlik umumiy hisobot (barcha filiallar bo'yicha) — cron orqali chaqiriladi. */
export async function notifyDailySummary(
  branchStats: BranchDailyStat[],
  totalOverdueDebt: number,
  overdueCount: number
) {
  try {
    const today = formatDate(new Date());

    const branchLines = branchStats
      .map((b) => {
        return (
          `🏢 <b>${escapeHtml(b.branchName)}</b>\n` +
          `   Omborda: ${b.inStockCount} dona\n` +
          `   Bugun sotildi: ${b.soldCount} dona\n` +
          `   Tushum: ${formatSum(b.revenueTotal)}\n` +
          `   Foyda: ${formatSum(b.profitTotal)}`
        );
      })
      .join("\n\n");

    const text =
      `📊 <b>Kunlik hisobot — ${today}</b>\n\n` +
      `${branchLines}\n\n` +
      `⚠️ Muddati o'tgan qarzlar: ${overdueCount} ta, jami ${formatSum(totalOverdueDebt)}`;

    await sendTelegramMessage(text);
  } catch (error) {
    console.error("[telegram-notify] Kunlik hisobot yuborilmadi:", error);
  }
}

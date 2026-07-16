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

import prisma from "@/lib/prisma";
import { getSystemOwnerUser } from "@/lib/access-control";
import { compareBranches, getDailySummaryAllBranches } from "@/lib/reports";
import { getAllOverdueCustomers } from "@/lib/customers";
import { escapeHtml, formatSum, formatMoneyTg, formatDate } from "@/lib/telegram";
import { postSoldPhonesToChannel, isChannelConfigured } from "@/lib/telegram-channel";
import { getUsdRate } from "@/lib/exchange-rate";
import { isOwnerChat, addAdmin, removeAdmin, listAdmins } from "@/lib/telegram-admins";

const HELP_TEXT =
  `🤖 <b>Mix Mobile bot</b>\n\n` +
  `Buyruqlar:\n` +
  `/holat — shu oy bo'yicha filiallar holati\n` +
  `/bugun — bugungi sotuvlar (har filial)\n` +
  `/qarzlar — muddati o'tgan qarzlar ro'yxati\n` +
  `/kanalga — sotilganlarni kanalga post qilish\n` +
  `/yordam — shu xabar\n\n` +
  `📱 Telefon qo'shish: rasm yuboring, izohiga\n` +
  `<code>Brend Model 128GB Rang Narx IMEI</code> yozing.\n\n` +
  `🔎 Ombor qidiruvi: shunchaki model nomini yozing\n` +
  `(masalan: <code>iPhone 13</code>)`;

/** Mijozlar (admin bo'lmaganlar) uchun qisqa salomlashish matni. */
export const CUSTOMER_GREETING =
  `Assalomu alaykum! 🤖\n\n` +
  `Men do'kon yordamchi botiman. Qaysi telefon kerakligini yozing — ` +
  `omborda bor-yo'qligini va narxini darhol aytaman.\n\n` +
  `Masalan: <code>iPhone 13</code> yoki <code>Samsung S23</code>`;

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
      `   Qarz: ${formatMoneyTg(remaining, c.currency)}\n` +
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

async function buildKanalgaReport(): Promise<string> {
  if (!isChannelConfigured()) {
    return (
      "⚠️ Kanal sozlanmagan. TELEGRAM_CHANNEL_ID environment variable'ni " +
      "kiriting (masalan @dokon_kanali) va botni kanalga admin qiling."
    );
  }
  const posted = await postSoldPhonesToChannel(true);
  return posted > 0
    ? `✅ ${posted} ta sotuv kanalga post qilindi.`
    : "Hozircha kanalga chiqarilmagan yangi sotuv yo'q.";
}

// Qidiruv so'rovidan olib tashlanadigan "shovqin" so'zlar —
// "iPhone 13 bormi, narxi qancha?" → "iphone 13"
const NOISE_WORDS = new Set([
  "bormi", "bor", "yo'qmi", "yoqmi", "narxi", "narx", "qancha", "necha",
  "pul", "so'm", "som", "dollar", "kerak", "salom", "assalomu", "alaykum",
  "iltimos", "menga", "telefon", "qanaqa", "va", "bilan", "uchun",
]);

/**
 * SEKRETAR BOT (5.4): erkin matnli so'rov bo'yicha OMBORDAN qidiradi —
 * AI ishlatilmaydi, faqat kalit so'z + baza qidiruvi. Barcha filiallar
 * bo'yicha "Omborda" statusidagi telefonlar tekshiriladi.
 */
export async function buildInventorySearchReply(rawQuery: string): Promise<string> {
  const tokens = rawQuery
    .toLowerCase()
    .replace(/[?!.,:;"']/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !NOISE_WORDS.has(t));

  if (tokens.length === 0) {
    return (
      `Qidirish uchun telefon modelini yozing.\n` +
      `Masalan: <code>iPhone 13</code> yoki <code>Redmi Note 12</code>`
    );
  }

  const phones = await prisma.phone.findMany({
    where: {
      status: "IN_STOCK",
      deletedAt: null,
      archivedAt: null,
      AND: tokens.map((token) => ({
        OR: [
          { model: { contains: token, mode: "insensitive" as const } },
          { brand: { contains: token, mode: "insensitive" as const } },
          { color: { contains: token, mode: "insensitive" as const } },
        ],
      })),
    },
    select: {
      brand: true,
      model: true,
      storageGB: true,
      color: true,
      salePrice: true,
      currency: true,
      condition: true,
    },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    take: 50,
  });

  if (phones.length === 0) {
    return (
      `❌ <b>"${escapeHtml(rawQuery.trim())}"</b> hozircha omborda yo'q.\n\n` +
      `Boshqa model nomi bilan qidirib ko'ring yoki keyinroq so'rang — ` +
      `yangi telefonlar tez-tez keladi! 📦`
    );
  }

  // Bir xil model+xotira variantlarini guruhlash
  const grouped = new Map<
    string,
    { title: string; count: number; minPrice: number; currency: "UZS" | "USD"; isNew: boolean }
  >();
  for (const p of phones) {
    const key = `${p.brand} ${p.model} ${p.storageGB}`;
    const price = Number(p.salePrice);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      if (price < existing.minPrice) {
        existing.minPrice = price;
        existing.currency = p.currency;
      }
    } else {
      grouped.set(key, {
        title: `${p.brand} ${p.model} (${p.storageGB}GB)`,
        count: 1,
        minPrice: price,
        currency: p.currency,
        isNew: p.condition === "NEW",
      });
    }
  }

  const usdRate = await getUsdRate();
  const lines = Array.from(grouped.values())
    .slice(0, 10)
    .map((g) => {
      const approx =
        g.currency === "USD"
          ? ` (≈ ${formatMoneyTg(g.minPrice * usdRate, "UZS")})`
          : "";
      const countNote = g.count > 1 ? ` — ${g.count} dona` : "";
      return `✅ <b>${escapeHtml(g.title)}</b>${countNote}\n    💰 ${formatMoneyTg(g.minPrice, g.currency)}${approx}`;
    });

  return (
    `🔎 Topildi (${phones.length} ta):\n\n${lines.join("\n\n")}\n\n` +
    `📞 Buyurtma yoki savol uchun bizga yozing!`
  );
}

// ---------------------------------------------------------------------------
// Admin boshqaruvi buyruqlari — FAQAT EGA (env'dagi ID, hozir 7802923308)
// ---------------------------------------------------------------------------

const ADMIN_MGMT_HELP =
  `👑 <b>Ega buyruqlari:</b>\n` +
  `/adminqosh &lt;chat_id&gt; [ism] — yangi admin qo'shish\n` +
  `/adminochir &lt;chat_id&gt; — adminni o'chirish\n` +
  `/adminlar — adminlar ro'yxati\n\n` +
  `Chat ID'ni bilish: yangi admin @userinfobot'ga /start yozsin — ` +
  `qaytgan raqam uning chat ID'si.`;

async function handleAdminMgmtCommand(
  command: string,
  rawText: string,
  chatId: string
): Promise<string> {
  if (!isOwnerChat(chatId)) {
    return "⛔ Bu buyruq faqat do'kon egasi uchun.";
  }

  const parts = rawText.trim().split(/\s+/).slice(1);

  if (command === "/adminlar") {
    const admins = await listAdmins();
    const lines = admins.map((a, i) => {
      const label = a.isOwner ? "👑 Ega" : `👤 ${escapeHtml(a.name ?? "Admin")}`;
      return `${i + 1}. ${label} — <code>${a.chatId}</code>`;
    });
    return `📋 <b>Adminlar (${admins.length}):</b>\n\n${lines.join("\n")}\n\n${ADMIN_MGMT_HELP}`;
  }

  const targetId = parts[0];
  if (!targetId || !/^\d{5,15}$/.test(targetId)) {
    return `❌ Chat ID noto'g'ri. Masalan: <code>${command} 123456789 Aziz</code>\n\n${ADMIN_MGMT_HELP}`;
  }

  if (command === "/adminqosh") {
    const name = parts.slice(1).join(" ") || null;
    await addAdmin(targetId, name, chatId);
    return (
      `✅ <b>Admin qo'shildi:</b> <code>${targetId}</code>${name ? ` (${escapeHtml(name)})` : ""}\n\n` +
      `U endi ikkala botda ham admin: hisobotlar, telefon/aksesuar qo'shish ` +
      `va barcha bildirishnomalarni oladi.\n\n` +
      `⚠️ Yangi admin AVVAL botga /start yozgan bo'lishi kerak — aks holda ` +
      `Telegram unga xabar yuborishga ruxsat bermaydi.`
    );
  }

  // /adminochir
  if (isOwnerChat(targetId)) {
    return "⛔ Egani o'chirib bo'lmaydi.";
  }
  const removed = await removeAdmin(targetId);
  return removed
    ? `🗑 Admin o'chirildi: <code>${targetId}</code>`
    : `❌ Bunday admin topilmadi: <code>${targetId}</code>`;
}

/**
 * Kelgan matnli buyruqni ishlab, javob matnini qaytaradi.
 * "/" bilan boshlanmagan matn — ombor qidiruvi (sekretar bot).
 * chatId — buyruq yuborgan admin chat'i (ega-buyruqlarini tekshirish uchun).
 */
export async function handleTelegramCommand(
  rawText: string,
  chatId = ""
): Promise<string> {
  const text = rawText.trim().toLowerCase();
  const command = text.split(/\s+/)[0];

  try {
    if (!command.startsWith("/")) {
      return await buildInventorySearchReply(rawText);
    }

    switch (command) {
      case "/start":
      case "/yordam":
      case "/help":
        return isOwnerChat(chatId) ? `${HELP_TEXT}\n\n${ADMIN_MGMT_HELP}` : HELP_TEXT;
      case "/holat":
        return await buildHolatReport();
      case "/bugun":
        return await buildBugunReport();
      case "/qarzlar":
        return await buildQarzlarReport();
      case "/kanalga":
        return await buildKanalgaReport();
      case "/adminqosh":
      case "/adminochir":
      case "/adminlar":
        return await handleAdminMgmtCommand(command, rawText, chatId);
      default:
        return `Buyruq tushunilmadi. 👇\n\n${HELP_TEXT}`;
    }
  } catch (error) {
    console.error("[telegram-bot] Buyruqni qayta ishlashda xatolik:", error);
    return "❌ Ma'lumotlarni olishda xatolik yuz berdi. Birozdan keyin urinib ko'ring.";
  }
}

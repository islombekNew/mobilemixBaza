/**
 * Mijozlar uchun do'kon boti (@mix_mobile_sotuvbot) — asosiy mantiq.
 *
 * MIJOZ uchun 3 bo'lim:
 *   📱 Telefonlar        — fuzzy qidiruv (ayfon/aypon/iphone -> iPhone)
 *   🎧 Aksesuarlar       — "ayfon 13 pro uchun g'ilof" kabi qidiruv
 *   📞 Admin bilan aloqa — xabari adminlarga yetkaziladi
 *
 * ADMIN uchun (TELEGRAM_ADMIN_CHAT_ID ro'yxatidagilar) qo'shimcha:
 *   - rasm/video + izoh yuborib (yoki kanaldan forward qilib) telefon qo'shish;
 *     IMEI bazada bo'lsa "mavjud" deydi, izohda "yangila" bo'lsa yangilaydi
 *   - izoh "aksesuar" bilan boshlansa — aksesuar qo'shiladi
 *
 * Bu bot CRM bilan BITTA bazada ishlaydi: saytda qo'shilgan telefonlar ham,
 * bot orqali qo'shilganlar ham bir joyda ko'rinadi.
 */

import prisma from "@/lib/prisma";
import {
  callTelegramApi,
  getShopBotToken,
  sendTelegramMessage,
  escapeHtml,
  formatMoneyTg,
} from "@/lib/telegram";
import { isAdminChat } from "@/lib/telegram-admins";
import { getSystemOwnerUser } from "@/lib/access-control";
import { createPhone } from "@/lib/phones";
import { parsePhoneCaption, downloadTelegramPhoto } from "@/lib/telegram-inbox";
import { uploadPhonePhoto, isBlobStorageConfigured } from "@/lib/blob-storage";
import { getUsdRate } from "@/lib/exchange-rate";
import { conditionLabelTg } from "./format";
import {
  searchPhones,
  searchAccessories,
  logSearchMiss,
  canonicalAccessoryCategory,
  normalizeText,
  type PhoneSearchResult,
  type AccessorySearchResult,
} from "./search";

// ---------------------------------------------------------------------------
// Klaviaturalar va matnlar
// ---------------------------------------------------------------------------

const BTN_PHONES = "📱 Telefonlar";
const BTN_ACCESSORIES = "🎧 Aksesuarlar";
const BTN_CONTACT = "📞 Admin bilan bog'lanish";

const MAIN_KEYBOARD = {
  keyboard: [[{ text: BTN_PHONES }, { text: BTN_ACCESSORIES }], [{ text: BTN_CONTACT }]],
  resize_keyboard: true,
};

const GREETING =
  `👋 <b>Xush kelibsiz!</b>\n\n` +
  `Bizda telefonlar va g'iloflar sotiladi.\n\n` +
  `Pastdagi tugmalardan birini bosing 👇`;

const ADMIN_HELP =
  `🛠 <b>Admin imkoniyatlari (shu botda):</b>\n\n` +
  `📱 <b>Telefon qo'shish</b> — rasm/video + izoh yuboring (kanaldan forward ham bo'ladi):\n` +
  `<code>Apple iPhone 13 128GB Qora 550$ 356789012345671</code>\n` +
  `IMEI bazada bo'lsa — "mavjud" deb ogohlantiraman. Yangilash uchun izohga <code>yangila</code> so'zini qo'shing (narx/media yangilanadi).\n\n` +
  `🎧 <b>Aksesuar qo'shish</b> — rasm + izoh, birinchi so'z "aksesuar":\n` +
  `<code>aksesuar G'ilof silikon model:iPhone 13 Pro 50000 soni:10</code>\n` +
  `Narx oxirida $ bo'lsa dollar. <code>model:</code> va <code>soni:</code> ixtiyoriy.`;

// ---------------------------------------------------------------------------
// Past darajali yordamchilar
// ---------------------------------------------------------------------------

function token(): string {
  return getShopBotToken() ?? "";
}

async function send(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  return callTelegramApi(token(), "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: MAIN_KEYBOARD,
    ...extra,
  });
}

/** Mahsulot kartasini media bilan yuboradi (file_id > blob URL > matn). */
async function sendCard(
  chatId: string | number,
  media: { tgPhotoFileId: string | null; tgVideoFileId: string | null; photoUrl: string | null },
  caption: string,
  inlineKeyboard?: unknown
) {
  const base: Record<string, unknown> = {
    chat_id: chatId,
    caption,
    parse_mode: "HTML",
  };
  if (inlineKeyboard) base.reply_markup = { inline_keyboard: inlineKeyboard };

  if (media.tgVideoFileId) {
    const r = await callTelegramApi(token(), "sendVideo", { ...base, video: media.tgVideoFileId });
    if (r.ok) return;
  }
  if (media.tgPhotoFileId) {
    const r = await callTelegramApi(token(), "sendPhoto", { ...base, photo: media.tgPhotoFileId });
    if (r.ok) return;
  }
  if (media.photoUrl) {
    const r = await callTelegramApi(token(), "sendPhoto", { ...base, photo: media.photoUrl });
    if (r.ok) return;
  }
  await callTelegramApi(token(), "sendMessage", {
    chat_id: chatId,
    text: caption,
    parse_mode: "HTML",
    ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
  });
}

async function setMode(chatId: string, mode: string) {
  await prisma.botChatState.upsert({
    where: { chatId },
    create: { chatId, mode },
    update: { mode },
  });
}

async function getMode(chatId: string): Promise<string> {
  const st = await prisma.botChatState.findUnique({ where: { chatId } });
  return st?.mode ?? "phone";
}

/**
 * "Admin bilan bog'lanish" matni: har filialning o'z Telegram admini
 * (Branch.telegramUsername) ro'yxat bo'lib chiqadi — mijoz kerakli
 * filialga to'g'ridan-to'g'ri yozadi. Username kodda emas, bazada —
 * har do'kon CRM'dan o'zinikini qo'yadi (Filiallar sahifasi).
 */
async function buildContactText(): Promise<string> {
  let branches: { name: string; telegramUsername: string | null }[] = [];
  try {
    branches = await prisma.branch.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { name: true, telegramUsername: true },
    });
  } catch (error) {
    console.error("[shop-bot] Filiallarni o'qishda xatolik:", error);
  }

  const withAdmin = branches.filter((b) => b.telegramUsername);

  if (withAdmin.length === 0) {
    // Hech bir filialga username qo'yilmagan — eski (yozib qoldirish) yo'li
    return `📞 Savolingizni shu yerga yozib qoldiring — adminga darhol yetkazamiz va tez orada javob berishadi.`;
  }

  const lines = withAdmin.map(
    (b) => `📍 <b>${escapeHtml(b.name)}</b>\n     👉 @${escapeHtml(b.telegramUsername!)}`
  );

  return (
    `📞 <b>Admin bilan bog'lanish</b>\n\n` +
    `Kerakli filial adminiga to'g'ridan-to'g'ri yozing:\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `Yoki savolingizni shu yerga yozib qoldiring — adminga yetkazamiz.`
  );
}

/** Mijoz haqida havola matni (adminга yuborish uchun). */
function userLink(from: { id: number; first_name?: string; last_name?: string; username?: string }) {
  const name = escapeHtml([from.first_name, from.last_name].filter(Boolean).join(" ") || "Mijoz");
  const uname = from.username ? ` (@${escapeHtml(from.username)})` : "";
  return `<a href="tg://user?id=${from.id}">${name}</a>${uname}`;
}

// ---------------------------------------------------------------------------
// Mahsulot kartalari
// ---------------------------------------------------------------------------

async function phoneCaption(p: PhoneSearchResult): Promise<string> {
  const usdRate = await getUsdRate();
  const approx =
    p.currency === "USD"
      ? ` (≈ ${formatMoneyTg(p.salePrice * usdRate, "UZS")})`
      : ` (≈ ${formatMoneyTg(p.salePrice / usdRate, "USD")})`;
  const memory = p.ramGB ? `${p.ramGB}/${p.storageGB}GB` : `${p.storageGB}GB`;
  const battery = p.batteryHealth ? ` · 🔋${p.batteryHealth}%` : "";

  return (
    `📱 <b>${escapeHtml(`${p.brand} ${p.model}`)}</b>\n` +
    `💾 ${memory} · ${escapeHtml(p.color)} · ${conditionLabelTg(p.condition)}${battery}\n` +
    `💰 <b>${formatMoneyTg(p.salePrice, p.currency)}</b>${approx}`
  );
}

function accessoryCaption(a: AccessorySearchResult): string {
  const forModel = a.forModel ? `\n📱 Mos: ${escapeHtml(a.forModel)}` : "";
  const desc = a.description ? `\n${escapeHtml(a.description)}` : "";
  return (
    `🎧 <b>${escapeHtml(a.name)}</b>${forModel}${desc}\n` +
    `💰 <b>${formatMoneyTg(a.price, a.currency)}</b>`
  );
}

function orderButton(kind: "phone" | "acc", id: string) {
  return [[{ text: "🛒 Sotib olish", callback_data: `order:${kind}:${id}` }]];
}

// ---------------------------------------------------------------------------
// Mijoz qidiruvlari
// ---------------------------------------------------------------------------

async function handlePhoneSearch(chatId: string, query: string) {
  const results = await searchPhones(query);

  if (results.length === 0) {
    void logSearchMiss(query, "phone");
    await send(
      chatId,
      `😕 <b>"${escapeHtml(query)}"</b> bo'yicha hozircha omborda telefon topilmadi.\n\n` +
        `Boshqa model yozib ko'ring yoki "${BTN_CONTACT}" orqali so'rab qoldiring — kelsa xabar beramiz.`
    );
    return;
  }

  await send(chatId, `🔎 Topildi: <b>${results.length} ta</b>`);
  for (const p of results) {
    await sendCard(chatId, p, await phoneCaption(p), orderButton("phone", p.id));
  }
}

async function handleAccessorySearch(chatId: string, query: string) {
  const results = await searchAccessories(query);

  if (results.length === 0) {
    void logSearchMiss(query, "accessory");
    await send(
      chatId,
      `😕 Bunday g'ilof hozircha yo'q ekan.\n\n` +
        `Boshqa model yozib ko'ring yoki "${BTN_CONTACT}" orqali so'rang — kelsa xabar beramiz.\n\n` +
        `<i>Eslatma: hozircha faqat g'iloflar sotuvda, boshqa aksesuarlar tez orada qo'shiladi.</i>`
    );
    return;
  }

  await send(chatId, `🔎 Topildi: <b>${results.length} ta</b>`);
  for (const a of results) {
    await sendCard(
      chatId,
      { tgPhotoFileId: a.tgPhotoFileId, tgVideoFileId: a.tgVideoFileId, photoUrl: null },
      accessoryCaption(a),
      orderButton("acc", a.id)
    );
  }
}

// ---------------------------------------------------------------------------
// Admin: telefon / aksesuar qo'shish
// ---------------------------------------------------------------------------

interface IncomingMedia {
  photoFileId?: string;
  videoFileId?: string;
}

/** "aksesuar G'ilof silikon model:iPhone 13 Pro 50000 soni:10" ni ajratadi. */
function parseAccessoryCaption(caption: string):
  | { name: string; forModel: string | null; price: number; currency: "UZS" | "USD"; quantity: number }
  | { error: string } {
  let text = caption.trim().replace(/^aksesuar\s*:?\s*/i, "");

  let forModel: string | null = null;
  const modelMatch = text.match(/model\s*:\s*([^;|]+?)(?=\s+\S+\s*:|\s+\d|$)/i);
  if (modelMatch) {
    forModel = modelMatch[1].trim();
    text = text.replace(modelMatch[0], " ");
  }

  let quantity = 1;
  const qtyMatch = text.match(/soni\s*:\s*(\d+)/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
    text = text.replace(qtyMatch[0], " ");
  }

  // Narx — oxirgi raqamli token ($ bilan yoki minglik nuqtali)
  const priceMatch = text.match(/\$?\s*([\d][\d.,\s]*)\s*\$?\s*$/);
  if (!priceMatch) {
    return { error: "Narx topilmadi. Masalan: <code>aksesuar G'ilof iPhone 13 50000</code>" };
  }
  const isUsd = priceMatch[0].includes("$");
  const price = isUsd
    ? Math.floor(Number(priceMatch[1].replace(/[,\s]/g, "")))
    : Number(priceMatch[1].replace(/[.,\s]/g, ""));
  text = text.slice(0, priceMatch.index).trim();

  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Narx noto'g'ri kiritildi." };
  }
  const name = text.replace(/\s+/g, " ").trim();
  if (name.length < 2) {
    return { error: "Aksesuar nomi topilmadi." };
  }

  return { name, forModel, price, currency: isUsd ? "USD" : "UZS", quantity };
}

async function handleAdminMedia(chatId: string, caption: string, media: IncomingMedia) {
  // --- Aksesuar qo'shish ---
  if (/^aksesuar/i.test(caption.trim())) {
    const parsed = parseAccessoryCaption(caption);
    if ("error" in parsed) {
      await send(chatId, `❌ ${parsed.error}\n\n${ADMIN_HELP}`);
      return;
    }
    const acc = await prisma.accessory.create({
      data: {
        name: parsed.name,
        forModel: parsed.forModel,
        price: parsed.price,
        currency: parsed.currency,
        quantity: parsed.quantity,
        tgPhotoFileId: media.photoFileId ?? null,
        tgVideoFileId: media.videoFileId ?? null,
      },
    });
    await send(
      chatId,
      `✅ <b>Aksesuar qo'shildi!</b>\n\n` +
        `🎧 ${escapeHtml(acc.name)}\n` +
        (acc.forModel ? `📱 Mos: ${escapeHtml(acc.forModel)}\n` : "") +
        `💰 ${formatMoneyTg(Number(acc.price), parsed.currency)}\n` +
        `📦 Soni: ${acc.quantity}`
    );
    return;
  }

  // --- Telefon qo'shish/yangilash ---
  const wantsUpdate = /\byangila\b|\bupdate\b/i.test(caption);
  const cleanCaption = caption.replace(/\byangila\b|\bupdate\b/gi, " ");

  const parsed = parsePhoneCaption(cleanCaption);
  if ("error" in parsed) {
    await send(chatId, `❌ ${parsed.error}`);
    return;
  }

  const existing = await prisma.phone.findFirst({
    where: { imei: parsed.imei, deletedAt: null },
  });

  if (existing && !wantsUpdate) {
    // Bilmasdan qayta qo'shishdan himoya
    await send(
      chatId,
      `❗ <b>Bu telefon bazada allaqachon mavjud.</b>\n\n` +
        `📱 ${escapeHtml(`${existing.brand} ${existing.model}`)}\n` +
        `🔢 IMEI: <code>${existing.imei}</code>\n` +
        `💰 Narxi: ${formatMoneyTg(Number(existing.salePrice), existing.currency === "USD" ? "USD" : "UZS")}\n` +
        `📋 Holati: ${existing.status === "IN_STOCK" ? "Omborda" : "Sotilgan"}\n\n` +
        `Narx yoki media yangilamoqchi bo'lsangiz, izohga <code>yangila</code> so'zini qo'shib qayta yuboring.`
    );
    return;
  }

  if (existing && wantsUpdate) {
    await prisma.phone.update({
      where: { id: existing.id },
      data: {
        salePrice: parsed.salePrice,
        currency: parsed.currency,
        ...(media.photoFileId ? { tgPhotoFileId: media.photoFileId } : {}),
        ...(media.videoFileId ? { tgVideoFileId: media.videoFileId } : {}),
      },
    });
    await send(
      chatId,
      `♻️ <b>Yangilandi!</b>\n\n📱 ${escapeHtml(`${existing.brand} ${existing.model}`)}\n` +
        `💰 Yangi narx: ${formatMoneyTg(parsed.salePrice, parsed.currency)}` +
        (media.photoFileId || media.videoFileId ? `\n🖼 Media ham yangilandi.` : "")
    );
    return;
  }

  // Yangi telefon — filial: ko'rsatilgan yoki birinchisi
  const branch = parsed.branchName
    ? await prisma.branch.findFirst({
        where: { name: { contains: parsed.branchName, mode: "insensitive" }, archivedAt: null },
      })
    : await prisma.branch.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: "asc" } });

  if (!branch) {
    await send(chatId, "❌ Tizimda faol filial topilmadi — avval CRM'da filial qo'shing.");
    return;
  }

  const owner = await getSystemOwnerUser();
  let phone;
  try {
    phone = await createPhone(owner, {
      brand: parsed.brand,
      model: parsed.model,
      color: parsed.color,
      storageGB: parsed.storageGB,
      imei: parsed.imei,
      condition: parsed.condition,
      costPrice: 0,
      salePrice: parsed.salePrice,
      currency: parsed.currency,
      branchId: branch.id,
    });
  } catch (error) {
    await send(
      chatId,
      `❌ ${escapeHtml(error instanceof Error ? error.message : "Telefon qo'shishda xatolik")}`
    );
    return;
  }

  // Telegram media file_id'larini saqlaymiz (mijozlarga tez yuborish uchun)
  await prisma.phone.update({
    where: { id: phone.id },
    data: {
      tgPhotoFileId: media.photoFileId ?? null,
      tgVideoFileId: media.videoFileId ?? null,
    },
  });

  // Rasmni CRM'da ham ko'rinishi uchun Blob'ga yuklaymiz (fon vazifasi emas,
  // lekin xato bo'lsa telefon baribir qo'shilgan bo'ladi)
  let photoNote = "";
  if (media.photoFileId && isBlobStorageConfigured()) {
    const file = await downloadTelegramPhoto(media.photoFileId, token());
    if (file) {
      const uploaded = await uploadPhonePhoto(phone.id, file);
      if (uploaded.ok && uploaded.url) {
        await prisma.phone.update({ where: { id: phone.id }, data: { photoUrl: uploaded.url } });
        photoNote = "🖼 Rasm CRM'ga ham biriktirildi.";
      }
    }
  }

  const usdRate = await getUsdRate();
  const approx =
    parsed.currency === "USD"
      ? ` (≈ ${formatMoneyTg(parsed.salePrice * usdRate, "UZS")})`
      : ` (≈ ${formatMoneyTg(parsed.salePrice / usdRate, "USD")})`;

  await send(
    chatId,
    `✅ <b>Omborga qo'shildi!</b>\n\n` +
      `📱 ${escapeHtml(`${parsed.brand} ${parsed.model}`)} (${parsed.storageGB}GB, ${escapeHtml(parsed.color)})\n` +
      `💰 ${formatMoneyTg(parsed.salePrice, parsed.currency)}${approx}\n` +
      `🔢 IMEI: <code>${parsed.imei}</code>\n` +
      `🏢 Filial: ${escapeHtml(branch.name)}\n` +
      (photoNote ? `${photoNote}\n` : "") +
      `\nMijozlar endi botda qidirsa shu telefonni ko'radi 🎉`
  );
}

// ---------------------------------------------------------------------------
// Buyurtma (inline tugma)
// ---------------------------------------------------------------------------

/** Mahsulot matnini tayyorlaydi (admin xabari uchun). */
async function productSummary(kind: string, id: string): Promise<string> {
  if (kind === "phone") {
    const p = await prisma.phone.findUnique({ where: { id } });
    if (p) {
      return (
        `📱 ${p.brand} ${p.model} (${p.storageGB}GB, ${p.color})\n` +
        `💰 ${formatMoneyTg(Number(p.salePrice), p.currency === "USD" ? "USD" : "UZS")}\n` +
        `🔢 IMEI: ${p.imei}`
      );
    }
  } else {
    const a = await prisma.accessory.findUnique({ where: { id } });
    if (a) {
      return (
        `🎧 ${a.name}${a.forModel ? ` (${a.forModel})` : ""}\n` +
        `💰 ${formatMoneyTg(Number(a.price), a.currency === "USD" ? "USD" : "UZS")}`
      );
    }
  }
  return "";
}

/**
 * "Sotib olish" bosilganda: telefon raqamini so'raymiz (mode = buy:kind:id).
 * Raqam kelgach handleBuyPhoneNumber adminlarga to'liq buyurtma yuboradi.
 */
async function handleOrderCallback(
  callbackId: string,
  chatId: string,
  data: string
) {
  const [, kind, id] = data.split(":");

  await setMode(chatId, `buy:${kind}:${id}`);

  await callTelegramApi(token(), "answerCallbackQuery", {
    callback_query_id: callbackId,
  });
  await send(
    chatId,
    `🛒 <b>Yaxshi tanlov!</b>\n\n` +
      `Buyurtmani rasmiylashtirish uchun <b>telefon raqamingizni</b> yozing:\n` +
      `<i>masalan: +998901234567</i>\n\n` +
      `Admin qo'ng'iroq qilib, yetkazib berish yoki olib ketishni kelishib oladi.`
  );
}

/** Buy rejimida kelgan matn — telefon raqami. Tekshirib, adminga yuboramiz. */
async function handleBuyPhoneNumber(
  chatId: string,
  mode: string,
  text: string,
  from?: { id: number; first_name?: string; last_name?: string; username?: string }
) {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 7) {
    await send(
      chatId,
      `📞 Telefon raqam noto'g'ri ko'rinadi. Qaytadan yozing:\n<i>masalan: +998901234567</i>`
    );
    return;
  }

  const [, kind, id] = mode.split(":");
  const productText = await productSummary(kind, id);

  await sendTelegramMessage(
    `🛒 <b>YANGI BUYURTMA (mijoz botidan)</b>\n\n` +
      `${escapeHtml(productText) || "Mahsulot topilmadi (o'chirilgan bo'lishi mumkin)"}\n\n` +
      `📞 Mijoz raqami: <code>${escapeHtml(text.trim())}</code>\n` +
      `👤 Telegram: ${from ? userLink(from) : "Noma'lum"}\n\n` +
      `Tezroq qo'ng'iroq qiling! ☎️`
  );

  await setMode(chatId, "phone");
  await send(
    chatId,
    `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
      `Admin tez orada <b>${escapeHtml(text.trim())}</b> raqamiga qo'ng'iroq qiladi.\n\n` +
      `Yana biror narsa kerakmi? Pastdagi tugmalardan foydalaning 👇`
  );
}

// ---------------------------------------------------------------------------
// Asosiy kirish nuqtasi
// ---------------------------------------------------------------------------

// Telegram update'ning bizga kerakli qismi
export interface ShopUpdate {
  message?: {
    chat?: { id?: number | string; type?: string };
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string }[];
    video?: { file_id: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: { chat?: { id?: number | string } };
    data?: string;
  };
}

export async function handleShopUpdate(update: ShopUpdate): Promise<void> {
  // --- Inline tugma bosilishi ---
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = String(cq.message?.chat?.id ?? cq.from.id);
    if (cq.data?.startsWith("order:")) {
      await handleOrderCallback(cq.id, chatId, cq.data);
    } else {
      await callTelegramApi(token(), "answerCallbackQuery", { callback_query_id: cq.id });
    }
    return;
  }

  const message = update.message;
  const chatIdRaw = message?.chat?.id;
  if (!message || chatIdRaw === undefined) return;
  if (message.chat?.type && message.chat.type !== "private") return;

  const chatId = String(chatIdRaw);
  const isAdmin = await isAdminChat(chatId);
  const from = message.from;

  // --- Media (rasm/video) — faqat admin qo'shishi mumkin ---
  const photoFileId = message.photo?.length
    ? message.photo[message.photo.length - 1].file_id
    : undefined;
  const videoFileId = message.video?.file_id;

  if (photoFileId || videoFileId) {
    if (!isAdmin) {
      await send(chatId, `Rasm qabul qilinmadi 🙂 Qidirish uchun matn yozing yoki "${BTN_CONTACT}" tugmasini bosing.`);
      return;
    }
    const caption = message.caption?.trim();
    if (!caption) {
      await send(chatId, `📸 Media qabul qilindi, lekin izoh (caption) yo'q.\n\n${ADMIN_HELP}`);
      return;
    }
    await handleAdminMedia(chatId, caption, { photoFileId, videoFileId });
    return;
  }

  const text = message.text?.trim();
  if (!text) return;

  // --- Buyruqlar va menyu tugmalari ---
  if (text === "/start" || text === "/yordam" || text === "/help") {
    await setMode(chatId, "phone");
    const startText = isAdmin
      ? `${GREETING}\n\n🛠 Siz adminsiz. Admin panel: /admin`
      : GREETING;
    await send(chatId, startText);
    return;
  }

  // Admin panel — faqat adminlar uchun (telefon/aksesuar qo'shish qo'llanmasi + ombor holati)
  if (text === "/admin" || text === "/panel") {
    if (!isAdmin) {
      await send(
        chatId,
        `🔒 Bu bo'lim faqat adminlar uchun.\n\nMijoz sifatida pastdagi tugmalardan foydalaning 👇`
      );
      return;
    }
    const [phoneCount, accessoryCount] = await Promise.all([
      prisma.phone.count({ where: { status: "IN_STOCK", deletedAt: null, archivedAt: null } }),
      prisma.accessory.count({ where: { deletedAt: null, quantity: { gt: 0 } } }),
    ]);
    await send(
      chatId,
      `🛠 <b>ADMIN PANEL</b>\n\n` +
        `📦 Omborda hozir: <b>${phoneCount} ta telefon</b>, <b>${accessoryCount} ta aksesuar</b>\n\n` +
        `${ADMIN_HELP}`
    );
    return;
  }

  if (text === BTN_PHONES) {
    await setMode(chatId, "phone");
    await send(chatId, `📱 Qaysi telefon kerak? Model nomini yozing:\n<i>masalan: iPhone 13 Pro, Samsung S23, Redmi Note 12</i>`);
    return;
  }

  if (text === BTN_ACCESSORIES) {
    await setMode(chatId, "accessory");
    await send(
      chatId,
      `🎧 <b>Aksesuarlar</b>\n\n` +
        `Hozircha faqat 📱 <b>g'iloflar</b> mavjud — boshqa aksesuarlar tez orada qo'shiladi.\n\n` +
        `Qaysi telefonga g'ilof kerak? Yozing:\n<i>masalan: iPhone 13 Pro</i>`
    );
    return;
  }

  if (text === BTN_CONTACT) {
    await setMode(chatId, "contact");
    await send(chatId, await buildContactText());
    return;
  }

  // Noma'lum /buyruq — telefon qidiruviga tushmasin (avval "/admin bo'yicha
  // telefon topilmadi" kabi chalkash javob chiqardi)
  if (text.startsWith("/")) {
    await send(
      chatId,
      isAdmin
        ? `Bunday buyruq yo'q 🤔\n\n🛠 Admin panel: /admin\n🔄 Boshlash: /start`
        : `Bunday buyruq yo'q 🤔 Boshlash uchun /start yoki pastdagi tugmalardan foydalaning 👇`
    );
    return;
  }

  // --- Matn: joriy rejimga qarab ---
  const mode = await getMode(chatId);

  // Sotib olish jarayoni: kelgan matn — mijozning telefon raqami
  if (mode.startsWith("buy:")) {
    await handleBuyPhoneNumber(chatId, mode, text, from);
    return;
  }

  if (mode === "contact") {
    await sendTelegramMessage(
      `💬 <b>Mijozdan xabar (do'kon boti)</b>\n\n` +
        `${escapeHtml(text)}\n\n` +
        `👤 ${from ? userLink(from) : "Noma'lum"}\n` +
        `🆔 Chat ID: <code>${chatId}</code>`
    );
    await send(chatId, `✅ Xabaringiz adminga yetkazildi. Tez orada javob berishadi!`);
    return;
  }

  if (mode === "accessory") {
    // Hozircha faqat g'iloflar: mijoz kategoriya yozmagan bo'lsa (masalan
    // faqat "iPhone 13 Pro" desa) avtomatik g'ilof qidiruvi qilinadi
    const hasCategory = normalizeText(text)
      .split(" ")
      .some((tok) => canonicalAccessoryCategory(tok));
    await handleAccessorySearch(chatId, hasCategory ? text : `g'ilof ${text}`);
    return;
  }

  // Sukut: telefon qidiruvi
  await handlePhoneSearch(chatId, text);
}

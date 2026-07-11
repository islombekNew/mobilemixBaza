import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSystemOwnerUser } from "@/lib/access-control";
import { createPhone, updatePhone, deletePhone } from "@/lib/phones";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import type { PhoneCondition } from "@prisma/client";

const SHEETS_SECRET = process.env.SHEETS_SECRET;

const rowSchema = z.object({
  amal: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(["ADD", "UPDATE", "DELETE"]))
    .default("ADD"),
  model: z.string().trim().min(1, "Model kiritilishi shart"),
  brand: z.string().trim().min(1, "Brend kiritilishi shart"),
  color: z.string().trim().min(1, "Rang kiritilishi shart"),
  storageGB: z.coerce.number().int().positive("Xotira musbat son bo'lishi kerak"),
  imei: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "IMEI 15 xonali raqam bo'lishi kerak"),
  condition: z
    .string()
    .trim()
    .transform((v) => {
      const map: Record<string, string> = {
        yangi: "NEW", new: "NEW",
        ishlatilgan: "USED", used: "USED", "б/у": "USED",
        "qayta tiklangan": "REFURBISHED", refurbished: "REFURBISHED",
      };
      return map[v.toLowerCase()] ?? v.toUpperCase();
    })
    .pipe(z.enum(["NEW", "USED", "REFURBISHED"], {
      errorMap: () => ({ message: 'Holati: "yangi", "ishlatilgan" yoki "qayta tiklangan" bo\'lishi kerak' }),
    })),
  costPrice: z.coerce.number().min(0, "Tan narxi manfiy bo'lishi mumkin emas"),
  salePrice: z.coerce.number().positive("Sotuv narxi musbat son bo'lishi kerak"),
  // Ixtiyoriy "valyuta" ustuni: "$", "usd", "dollar" → USD; qolgani so'm
  currency: z
    .string()
    .trim()
    .transform((v) => {
      const val = v.toLowerCase();
      return ["$", "usd", "dollar", "dollor"].includes(val) ? "USD" : "UZS";
    })
    .pipe(z.enum(["UZS", "USD"]))
    .optional()
    .default("UZS"),
  branch: z.string().trim().min(1, "Filial nomi kiritilishi shart"),
  ramGB: z.coerce.number().int().positive().optional().nullable(),
  warrantyMonths: z.coerce.number().int().min(0).default(0),
  supplier: z.string().trim().max(200).optional().nullable(),
  hasBox: z.preprocess(
    (v) => ["ha", "yes", "true", "1", "+"].includes(String(v).toLowerCase().trim()),
    z.boolean()
  ).default(false),
  hasCharger: z.preprocess(
    (v) => ["ha", "yes", "true", "1", "+"].includes(String(v).toLowerCase().trim()),
    z.boolean()
  ).default(false),
  hasDocuments: z.preprocess(
    (v) => ["ha", "yes", "true", "1", "+"].includes(String(v).toLowerCase().trim()),
    z.boolean()
  ).default(false),
});

type SyncResult = { row: number; status: "OK" | "SKIP" | "ERROR"; message: string };

export async function POST(request: NextRequest) {
  if (!SHEETS_SECRET) {
    return NextResponse.json({ error: "SHEETS_SECRET sozlanmagan" }, { status: 500 });
  }

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${SHEETS_SECRET}`) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formatida ma'lumot kerak" }, { status: 400 });
  }

  const rows = Array.isArray((body as { rows?: unknown }).rows)
    ? ((body as { rows: unknown[] }).rows)
    : [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "Qatorlar bo'sh" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json(
      { error: "Bir martada 500 tadan ko'p qator bo'lishi mumkin emas" },
      { status: 400 }
    );
  }

  const systemUser = await getSystemOwnerUser();
  const results: SyncResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const parsed = rowSchema.safeParse(rows[i]);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      results.push({
        row: rowNum,
        status: "ERROR",
        message: issue?.message ?? "Format xatosi",
      });
      continue;
    }

    const row = parsed.data;

    const branch = await prisma.branch.findFirst({
      where: { name: { contains: row.branch, mode: "insensitive" } },
    });

    if (!branch) {
      results.push({
        row: rowNum,
        status: "ERROR",
        message: `Filial topilmadi: "${row.branch}"`,
      });
      continue;
    }

    try {
      if (row.amal === "DELETE") {
        const phone = await prisma.phone.findFirst({
          where: { imei: row.imei, deletedAt: null },
        });
        if (!phone) {
          results.push({ row: rowNum, status: "ERROR", message: `IMEI topilmadi: ${row.imei}` });
          continue;
        }
        await deletePhone(systemUser, phone.id);
        results.push({ row: rowNum, status: "OK", message: "O'chirildi" });

      } else if (row.amal === "UPDATE") {
        const phone = await prisma.phone.findFirst({
          where: { imei: row.imei, deletedAt: null },
        });
        if (!phone) {
          results.push({ row: rowNum, status: "ERROR", message: `IMEI topilmadi: ${row.imei}` });
          continue;
        }
        await updatePhone(systemUser, phone.id, {
          model: row.model,
          brand: row.brand,
          color: row.color,
          storageGB: row.storageGB,
          condition: row.condition as PhoneCondition,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          currency: row.currency,
          ramGB: row.ramGB ?? null,
          warrantyMonths: row.warrantyMonths,
          supplier: row.supplier ?? null,
          hasBox: row.hasBox,
          hasCharger: row.hasCharger,
          hasDocuments: row.hasDocuments,
        });
        results.push({ row: rowNum, status: "OK", message: "Yangilandi" });

      } else {
        // UPSERT — mavjud bo'lsa yangilaydi, yo'q bo'lsa qo'shadi
        const existing = await prisma.phone.findFirst({
          where: { imei: row.imei, deletedAt: null },
        });
        const phoneFields = {
          model: row.model,
          brand: row.brand,
          color: row.color,
          storageGB: row.storageGB,
          condition: row.condition as PhoneCondition,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          currency: row.currency,
          ramGB: row.ramGB ?? null,
          warrantyMonths: row.warrantyMonths,
          supplier: row.supplier ?? null,
          hasBox: row.hasBox,
          hasCharger: row.hasCharger,
          hasDocuments: row.hasDocuments,
        };

        if (existing) {
          await updatePhone(systemUser, existing.id, phoneFields);
          results.push({ row: rowNum, status: "OK", message: "Yangilandi" });
        } else {
          await createPhone(systemUser, {
            ...phoneFields,
            imei: row.imei,
            branchId: branch.id,
          });
          results.push({ row: rowNum, status: "OK", message: "Qo'shildi" });
        }
      }
    } catch (err) {
      results.push({
        row: rowNum,
        status: "ERROR",
        message: err instanceof Error ? err.message : "Noma'lum xatolik",
      });
    }
  }

  const ok = results.filter((r) => r.status === "OK").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;
  const errors = results.filter((r) => r.status === "ERROR").length;

  // Faqat kamida 1 ta muvaffaqiyatli amal bo'lganda Telegram ga xabar yuborish
  if (ok > 0) {
    const branches = [...new Set(rows.map((r) => (r as { branch?: string }).branch).filter(Boolean))];
    const branchName = branches[0] ?? "Noma'lum filial";
    void sendTelegramMessage(
      `📦 <b>Google Sheets orqali yangi telefonlar</b>\n\n` +
      `🏢 Filial: ${escapeHtml(String(branchName))}\n` +
      `✅ Qo'shildi: ${ok} ta\n` +
      `⏭️ O'tkazildi: ${skipped} ta\n` +
      `❌ Xato: ${errors} ta`
    ).catch((e: unknown) => console.error("[sheets-sync] Telegram xabari yuborilmadi:", e));
  }

  return NextResponse.json({ results, summary: { ok, skipped, errors } });
}

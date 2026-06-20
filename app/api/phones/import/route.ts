import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser } from "@/lib/session";
import { bulkImportPhones, type ImportSummary } from "@/lib/phones";
import { handleApiError } from "@/lib/api-errors";
import { phoneImportRowSchema, type PhoneImportRow } from "@/lib/validation";

/**
 * Excel'dagi ustun nomlari odam o'qiy oladigan tilda (masalan, "Tan narxi")
 * bo'lishi uchun, lekin kodda ingliz nomlar bilan ishlash uchun — bu
 * lug'at ustun sarlavhasini ichki maydon nomiga moslaydi. Bir nechta
 * variant qo'llab-quvvatlanadi (katta-kichik harf, bo'sh joy farqi).
 */
const HEADER_ALIASES: Record<string, keyof PhoneImportRow> = {
  model: "model",
  brend: "brand",
  brand: "brand",
  rang: "color",
  color: "color",
  "xotira (gb)": "storageGB",
  "xotira(gb)": "storageGB",
  xotira: "storageGB",
  storagegb: "storageGB",
  imei: "imei",
  holati: "condition",
  holat: "condition",
  condition: "condition",
  "tan narxi": "costPrice",
  tannarxi: "costPrice",
  costprice: "costPrice",
  "sotuv narxi": "salePrice",
  sotuvnarxi: "salePrice",
  saleprice: "salePrice",
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function mapRowToFields(rawRow: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(rawRow)) {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field) mapped[field] = typeof value === "string" ? value.trim() : value;
  }
  return mapped;
}

/**
 * Tayyor shablon (.xlsx) — sotuvchi to'g'ri ustun nomlari bilan to'ldirib,
 * shu faylni qaytarib yuklasin deb. GET /api/phones/import
 */
export async function GET() {
  await requireUser();

  const headers = [
    "Model",
    "Brend",
    "Rang",
    "Xotira (GB)",
    "IMEI",
    "Holati",
    "Tan narxi",
    "Sotuv narxi",
  ];
  const exampleRow = [
    "iPhone 13",
    "Apple",
    "Ko'k",
    128,
    "356789012345671",
    "NEW",
    5800000,
    6500000,
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Telefonlar");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="telefonlar-shabloni.xlsx"',
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const branchId = (formData.get("branchId") as string | null) ?? user.branchId;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ error: "branchId ko'rsatilishi kerak" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: "Faylda hech qanday varaq topilmadi" }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Faylda ma'lumot topilmadi" }, { status: 400 });
    }
    if (rawRows.length > 500) {
      return NextResponse.json(
        { error: "Bir martada 500 tadan ortiq qator yuklab bo'lmaydi" },
        { status: 400 }
      );
    }

    const validRows: PhoneImportRow[] = [];
    const formatErrors: { row: number; reason: string }[] = [];

    rawRows.forEach((rawRow, index) => {
      const mapped = mapRowToFields(rawRow);
      const parsed = phoneImportRowSchema.safeParse(mapped);
      if (parsed.success) {
        validRows.push(parsed.data);
      } else {
        formatErrors.push({
          row: index + 2, // +1 — 0-index, +1 — sarlavha qatori
          reason: parsed.error.issues[0]?.message ?? "Noto'g'ri format",
        });
      }
    });

    const importResult: ImportSummary =
      validRows.length > 0
        ? await bulkImportPhones(user, branchId, validRows)
        : { created: 0, skipped: [] };

    const summary: ImportSummary = {
      created: importResult.created,
      skipped: [...formatErrors, ...importResult.skipped].sort((a, b) => a.row - b.row),
    };

    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}

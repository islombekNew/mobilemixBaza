import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser } from "@/lib/session";
import { getProfitReport, getTopModels, getSellerPerformance } from "@/lib/reports";
import { listCustomers } from "@/lib/customers";
import { listBranches } from "@/lib/branches";
import { handleApiError } from "@/lib/api-errors";

function formatDateForSheet(date: Date): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Bitta filial bo'yicha to'liq Excel hisobotini yaratadi — 4 varaqli:
 * Foyda hisobi, Eng ko'p sotilgan, Xodimlar, Qarzlar. Hisobotlar
 * sahifasidagi "📊 Excel'ga eksport" tugmasi shu endpoint'ga murojaat qiladi.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") ?? user.branchId;

  if (!branchId) {
    return NextResponse.json({ error: "branchId ko'rsatilishi kerak" }, { status: 400 });
  }

  try {
    const [branches, profitReport, topModels, sellerPerformance, customers] =
      await Promise.all([
        listBranches(user),
        getProfitReport(user, branchId),
        getTopModels(user, branchId, 10),
        getSellerPerformance(user, branchId),
        listCustomers(user, branchId),
      ]);

    const branchName =
      branches.find((b) => b.id === branchId)?.name ?? "Noma'lum filial";

    const workbook = XLSX.utils.book_new();

    // --- 1. Foyda hisobi ---
    const profitSheetData = [
      ["Sana", "Model", "Sotuv narxi", "Tan narxi", "Foyda"],
      ...profitReport.rows.map((r) => [
        formatDateForSheet(r.saleDate),
        r.model,
        r.salePrice,
        r.costPrice,
        r.profit,
      ]),
      [],
      ["", "", "", "Jami foyda:", profitReport.totalProfit],
    ];
    const profitSheet = XLSX.utils.aoa_to_sheet(profitSheetData);
    XLSX.utils.book_append_sheet(workbook, profitSheet, "Foyda hisobi");

    // --- 2. Eng ko'p sotilgan modellar ---
    const topModelsSheetData = [
      ["Brend", "Model", "Sotilgan soni", "Tushum"],
      ...topModels.map((m) => [m.brand, m.model, m.count, m.revenue]),
    ];
    const topModelsSheet = XLSX.utils.aoa_to_sheet(topModelsSheetData);
    XLSX.utils.book_append_sheet(workbook, topModelsSheet, "Eng ko'p sotilgan");

    // --- 3. Xodimlar (shu oy) ---
    const sellersSheetData = [
      ["Sotuvchi", "Sotilgan soni", "Tushum", "Foyda"],
      ...sellerPerformance.map((s) => [s.sellerName, s.count, s.revenue, s.profit]),
    ];
    const sellersSheet = XLSX.utils.aoa_to_sheet(sellersSheetData);
    XLSX.utils.book_append_sheet(workbook, sellersSheet, "Xodimlar (shu oy)");

    // --- 4. Qarzlar (PAID bo'lmaganlar) ---
    const unpaidCustomers = customers.filter((c) => c.status !== "PAID");
    const debtsSheetData = [
      ["Mijoz", "Telefon", "Model", "Umumiy summa", "To'langan", "Qolgan qarz", "Muddat", "Holati"],
      ...unpaidCustomers.map((c) => [
        c.fullName,
        c.phoneNumber,
        `${c.sale.phone.brand} ${c.sale.phone.model}`,
        Number(c.totalAmount),
        Number(c.paidAmount),
        Number(c.totalAmount) - Number(c.paidAmount),
        formatDateForSheet(c.dueDate),
        c.status === "OVERDUE" ? "Muddati o'tgan" : "Faol",
      ]),
    ];
    const debtsSheet = XLSX.utils.aoa_to_sheet(debtsSheetData);
    XLSX.utils.book_append_sheet(workbook, debtsSheet, "Qarzlar");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const today = formatDateForSheet(new Date()).replace(/\./g, "-");
    const safeBranchName = branchName.replace(/[^a-zA-Z0-9 \-']/g, "");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Hisobot - ${safeBranchName} - ${today}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

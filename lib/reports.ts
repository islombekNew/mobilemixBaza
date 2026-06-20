import prisma from "@/lib/prisma";
import { assertBranchAccess, assertOwner, type SessionUser } from "@/lib/access-control";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type DashboardPeriod = "today" | "yesterday" | "week" | "month";

function getPeriodStart(period: DashboardPeriod): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return startOfDay(now);
    case "yesterday": {
      const d = startOfDay(now);
      d.setDate(d.getDate() - 1);
      return d;
    }
    case "week": {
      const d = startOfDay(now);
      d.setDate(d.getDate() - 6);
      return d;
    }
    case "month":
    default:
      return startOfMonth(now);
  }
}

/**
 * PRD 3.4: Filial bosh sahifasi (dashboard).
 * "Omborda qolgan mahsulotlar", "Shu oy kirgan/chiqgan mahsulotlar",
 * "Shu oy foyda", "eng ko'p sotilgan model, eng yuqori sotuv kuni"
 */
export async function getBranchDashboard(
  user: SessionUser,
  branchId: string,
  period: DashboardPeriod = "month"
) {
  assertBranchAccess(user, branchId);

  const monthStart = getPeriodStart(period);

  const [inStockCount, inAddedThisMonth, salesThisMonth] = await Promise.all([
    prisma.phone.count({ where: { branchId, status: "IN_STOCK" } }),
    prisma.phone.findMany({
      where: { branchId, createdAt: { gte: monthStart } },
      select: { costPrice: true },
    }),
    prisma.sale.findMany({
      where: { branchId, saleDate: { gte: monthStart } },
      select: {
        finalPrice: true,
        saleDate: true,
        phone: { select: { costPrice: true, model: true } },
      },
    }),
  ]);

  type AddedPhoneRow = (typeof inAddedThisMonth)[number];
  type SaleRow = (typeof salesThisMonth)[number];

  const incomingCount = inAddedThisMonth.length;
  const incomingCostTotal = inAddedThisMonth.reduce(
    (sum: number, p: AddedPhoneRow) => sum + Number(p.costPrice),
    0
  );

  const soldCount = salesThisMonth.length;
  const soldRevenueTotal = salesThisMonth.reduce(
    (sum: number, s: SaleRow) => sum + Number(s.finalPrice),
    0
  );
  const monthProfit = salesThisMonth.reduce(
    (sum: number, s: SaleRow) => sum + (Number(s.finalPrice) - Number(s.phone.costPrice)),
    0
  );

  // Eng ko'p sotilgan model
  const modelCounts = new Map<string, number>();
  for (const sale of salesThisMonth) {
    modelCounts.set(sale.phone.model, (modelCounts.get(sale.phone.model) ?? 0) + 1);
  }
  let topModel: string | null = null;
  let topModelCount = 0;
  for (const [model, count] of modelCounts) {
    if (count > topModelCount) {
      topModel = model;
      topModelCount = count;
    }
  }

  // Eng yuqori sotuv kuni (kun bo'yicha summa)
  const dailyRevenue = new Map<string, number>();
  for (const sale of salesThisMonth) {
    const key = startOfDay(sale.saleDate).toISOString().slice(0, 10);
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + Number(sale.finalPrice));
  }
  let bestDay: string | null = null;
  let bestDayRevenue = 0;
  for (const [day, revenue] of dailyRevenue) {
    if (revenue > bestDayRevenue) {
      bestDay = day;
      bestDayRevenue = revenue;
    }
  }

  return {
    inStockCount,
    incomingCount,
    incomingCostTotal,
    soldCount,
    soldRevenueTotal,
    monthProfit,
    topModel,
    topModelCount,
    bestDay,
    bestDayRevenue,
  };
}

/** PRD 3.7: "Eng ko'p sotilgan modellar reytingi" (filial bo'yicha, barcha vaqt) */
export async function getTopModels(user: SessionUser, branchId: string, limit = 5) {
  assertBranchAccess(user, branchId);

  const sales = await prisma.sale.findMany({
    where: { branchId },
    select: { finalPrice: true, phone: { select: { model: true, brand: true } } },
  });

  const grouped = new Map<string, { model: string; brand: string; count: number; revenue: number }>();
  for (const sale of sales) {
    const key = `${sale.phone.brand} ${sale.phone.model}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.revenue += Number(sale.finalPrice);
    } else {
      grouped.set(key, {
        model: sale.phone.model,
        brand: sale.phone.brand,
        count: 1,
        revenue: Number(sale.finalPrice),
      });
    }
  }

  return Array.from(grouped.values())
    .sort(
      (
        a: { count: number },
        b: { count: number }
      ) => b.count - a.count
    )
    .slice(0, limit);
}

/** PRD 3.7: "Filiallar taqqoslash (owner uchun)" */
export async function compareBranches(user: SessionUser) {
  assertOwner(user);

  const monthStart = startOfMonth();
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });

  type BranchRow = (typeof branches)[number];

  const results = await Promise.all(
    branches.map(async (branch: BranchRow) => {
      const [inStockCount, sales] = await Promise.all([
        prisma.phone.count({ where: { branchId: branch.id, status: "IN_STOCK" } }),
        prisma.sale.findMany({
          where: { branchId: branch.id, saleDate: { gte: monthStart } },
          select: { finalPrice: true, phone: { select: { costPrice: true } } },
        }),
      ]);

      type CompareSaleRow = (typeof sales)[number];

      const revenue = sales.reduce(
        (sum: number, s: CompareSaleRow) => sum + Number(s.finalPrice),
        0
      );
      const profit = sales.reduce(
        (sum: number, s: CompareSaleRow) =>
          sum + (Number(s.finalPrice) - Number(s.phone.costPrice)),
        0
      );

      return {
        branchId: branch.id,
        branchName: branch.name,
        inStockCount,
        salesCount: sales.length,
        revenue,
        profit,
      };
    })
  );

  return results;
}

/**
 * Barcha filiallar bo'yicha BUGUNGI qisqa hisobot (Telegram bot /bugun
 * buyrug'i va kunlik cron hisobot uchun). Faqat owner uchun — Telegram
 * bot doim "system owner" sifatida ishlaydi (app/api/telegram/webhook).
 */
export async function getDailySummaryAllBranches(user: SessionUser) {
  assertOwner(user);

  const dayStart = startOfDay();
  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });

  type DailyBranchRow = (typeof branches)[number];

  const stats = await Promise.all(
    branches.map(async (branch: DailyBranchRow) => {
      const [inStockCount, salesToday] = await Promise.all([
        prisma.phone.count({ where: { branchId: branch.id, status: "IN_STOCK" } }),
        prisma.sale.findMany({
          where: { branchId: branch.id, saleDate: { gte: dayStart } },
          select: { finalPrice: true, phone: { select: { costPrice: true } } },
        }),
      ]);

      type DailySaleRow = (typeof salesToday)[number];

      const revenueTotal = salesToday.reduce(
        (sum: number, s: DailySaleRow) => sum + Number(s.finalPrice),
        0
      );
      const profitTotal = salesToday.reduce(
        (sum: number, s: DailySaleRow) =>
          sum + (Number(s.finalPrice) - Number(s.phone.costPrice)),
        0
      );

      return {
        branchName: branch.name,
        inStockCount,
        soldCount: salesToday.length,
        revenueTotal,
        profitTotal,
      };
    })
  );

  return stats;
}
/**
 * Oxirgi N kunlik tushum/foyda qatori — kunlik grafik uchun
 * (hisobotlar sahifasidagi chart). Sotuv bo'lmagan kunlar 0 bilan to'ladi,
 * shu sababli grafikda uzilish bo'lmaydi.
 */
export async function getDailyRevenueSeries(
  user: SessionUser,
  branchId: string,
  days = 30
) {
  assertBranchAccess(user, branchId);

  const rangeStart = startOfDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));

  const sales = await prisma.sale.findMany({
    where: { branchId, saleDate: { gte: rangeStart } },
    select: {
      finalPrice: true,
      saleDate: true,
      phone: { select: { costPrice: true } },
    },
  });

  const byDay = new Map<string, { revenue: number; profit: number }>();
  for (const sale of sales) {
    const key = startOfDay(sale.saleDate).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, profit: 0 };
    entry.revenue += Number(sale.finalPrice);
    entry.profit += Number(sale.finalPrice) - Number(sale.phone.costPrice);
    byDay.set(key, entry);
  }

  const series: { date: string; revenue: number; profit: number }[] = [];
  for (let i = 0; i < days; i++) {
    const day = startOfDay(new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000));
    const key = day.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, profit: 0 };
    series.push({ date: key, revenue: entry.revenue, profit: entry.profit });
  }

  return series;
}

/**
 * Xodimlar (sotuvchilar) bo'yicha hisobot — har bir sotuvchi shu oyda
 * nechta telefon sotgani, qancha tushum va foyda keltirgani.
 */
export async function getSellerPerformance(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  const monthStart = startOfMonth();

  const sales = await prisma.sale.findMany({
    where: { branchId, saleDate: { gte: monthStart } },
    select: {
      finalPrice: true,
      seller: { select: { id: true, name: true } },
      phone: { select: { costPrice: true } },
    },
  });

  const grouped = new Map<
    string,
    { sellerId: string; sellerName: string; count: number; revenue: number; profit: number }
  >();

  for (const sale of sales) {
    const existing = grouped.get(sale.seller.id);
    const revenue = Number(sale.finalPrice);
    const profit = Number(sale.finalPrice) - Number(sale.phone.costPrice);

    if (existing) {
      existing.count += 1;
      existing.revenue += revenue;
      existing.profit += profit;
    } else {
      grouped.set(sale.seller.id, {
        sellerId: sale.seller.id,
        sellerName: sale.seller.name,
        count: 1,
        revenue,
        profit,
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getProfitReport(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  const sales = await prisma.sale.findMany({
    where: { branchId },
    orderBy: { saleDate: "desc" },
    select: {
      id: true,
      finalPrice: true,
      saleDate: true,
      phone: { select: { model: true, brand: true, costPrice: true } },
    },
  });

  type ProfitSaleRow = (typeof sales)[number];

  const rows = sales.map((sale: ProfitSaleRow) => ({
    id: sale.id,
    model: `${sale.phone.brand} ${sale.phone.model}`,
    saleDate: sale.saleDate,
    salePrice: Number(sale.finalPrice),
    costPrice: Number(sale.phone.costPrice),
    profit: Number(sale.finalPrice) - Number(sale.phone.costPrice),
  }));

  type ProfitRow = (typeof rows)[number];

  const totalProfit = rows.reduce(
    (sum: number, r: ProfitRow) => sum + r.profit,
    0
  );

  return { rows, totalProfit };
}

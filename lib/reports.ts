import prisma from "@/lib/prisma";
import { assertBranchAccess, assertOwner, type SessionUser } from "@/lib/access-control";
import { getUsdRate } from "@/lib/exchange-rate";
import { toUZS } from "@/lib/currency";

// Barcha hisobotlar YAGONA bazaviy valyutada — so'mda hisoblanadi.
// $ da kiritilgan narxlar joriy CBU kursi orqali so'mga o'giriladi,
// shunda aralash valyutali sotuvlarda ham foyda to'g'ri chiqadi.

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

  const [usdRate, inStockCount, inAddedThisMonth, salesThisMonth, inStockPhones] = await Promise.all([
    getUsdRate(),
    prisma.phone.count({ where: { branchId, status: "IN_STOCK" } }),
    prisma.phone.findMany({
      where: { branchId, createdAt: { gte: monthStart } },
      select: { costPrice: true, currency: true },
    }),
    prisma.sale.findMany({
      where: { branchId, saleDate: { gte: monthStart }, returnedAt: null },
      select: {
        finalPrice: true,
        currency: true,
        saleDate: true,
        phone: { select: { costPrice: true, currency: true, model: true, brand: true } },
      },
    }),
    prisma.phone.findMany({
      where: { branchId, status: "IN_STOCK" },
      select: { condition: true },
    }),
  ]);

  type AddedPhoneRow = (typeof inAddedThisMonth)[number];
  type SaleRow = (typeof salesThisMonth)[number];

  const revenueUZS = (s: SaleRow) => toUZS(Number(s.finalPrice), s.currency, usdRate);
  const profitUZS = (s: SaleRow) =>
    revenueUZS(s) - toUZS(Number(s.phone.costPrice), s.phone.currency, usdRate);

  const incomingCount = inAddedThisMonth.length;
  const incomingCostTotal = inAddedThisMonth.reduce(
    (sum: number, p: AddedPhoneRow) => sum + toUZS(Number(p.costPrice), p.currency, usdRate),
    0
  );

  const soldCount = salesThisMonth.length;
  const soldRevenueTotal = salesThisMonth.reduce(
    (sum: number, s: SaleRow) => sum + revenueUZS(s),
    0
  );
  const monthProfit = salesThisMonth.reduce(
    (sum: number, s: SaleRow) => sum + profitUZS(s),
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
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + revenueUZS(sale));
  }
  let bestDay: string | null = null;
  let bestDayRevenue = 0;
  for (const [day, revenue] of dailyRevenue) {
    if (revenue > bestDayRevenue) {
      bestDay = day;
      bestDayRevenue = revenue;
    }
  }

  // Kunlik sotuv seriyasi (chart uchun)
  const dailyMap = new Map<string, { revenue: number; profit: number; count: number }>();
  for (const sale of salesThisMonth) {
    const key = startOfDay(sale.saleDate).toISOString().slice(0, 10);
    const entry = dailyMap.get(key) ?? { revenue: 0, profit: 0, count: 0 };
    entry.revenue += revenueUZS(sale);
    entry.profit += profitUZS(sale);
    entry.count += 1;
    dailyMap.set(key, entry);
  }

  // Barcha kunlarni to'ldirish (bo'sh kunlar 0)
  const periodDays = period === "today" || period === "yesterday" ? 1 : period === "week" ? 7 : 30;
  const dailySeries: { date: string; revenue: number; profit: number; count: number }[] = [];
  for (let i = 0; i < periodDays; i++) {
    const day = new Date(monthStart.getTime() + i * 86400000);
    const key = day.toISOString().slice(0, 10);
    const entry = dailyMap.get(key) ?? { revenue: 0, profit: 0, count: 0 };
    dailySeries.push({ date: key, ...entry });
  }

  // Top 5 model (sotuv soni bo'yicha)
  const modelMap = new Map<string, { model: string; count: number; revenue: number }>();
  for (const sale of salesThisMonth) {
    const key = `${sale.phone.brand} ${sale.phone.model}`;
    const entry = modelMap.get(key) ?? { model: key, count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += revenueUZS(sale);
    modelMap.set(key, entry);
  }
  const topModels = Array.from(modelMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Ombordagi telefonlar holati (pie chart uchun)
  const conditionMap = new Map<string, number>();
  for (const p of inStockPhones) {
    conditionMap.set(p.condition, (conditionMap.get(p.condition) ?? 0) + 1);
  }
  const conditionStats = [
    { condition: "NEW", label: "Yangi", count: conditionMap.get("NEW") ?? 0 },
    { condition: "USED", label: "Ishlatilgan", count: conditionMap.get("USED") ?? 0 },
    { condition: "REFURBISHED", label: "Qayta tiklangan", count: conditionMap.get("REFURBISHED") ?? 0 },
  ].filter((c) => c.count > 0);

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
    dailySeries,
    topModels,
    conditionStats,
  };
}

/** PRD 3.7: "Eng ko'p sotilgan modellar reytingi" (filial bo'yicha, barcha vaqt) */
export async function getTopModels(user: SessionUser, branchId: string, limit = 5) {
  assertBranchAccess(user, branchId);

  const [usdRate, sales] = await Promise.all([
    getUsdRate(),
    prisma.sale.findMany({
      where: { branchId, returnedAt: null },
      select: { finalPrice: true, currency: true, phone: { select: { model: true, brand: true } } },
    }),
  ]);

  const grouped = new Map<string, { model: string; brand: string; count: number; revenue: number }>();
  for (const sale of sales) {
    const key = `${sale.phone.brand} ${sale.phone.model}`;
    const revenue = toUZS(Number(sale.finalPrice), sale.currency, usdRate);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.revenue += revenue;
    } else {
      grouped.set(key, {
        model: sale.phone.model,
        brand: sale.phone.brand,
        count: 1,
        revenue,
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
  const [usdRate, branches] = await Promise.all([
    getUsdRate(),
    prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  type BranchRow = (typeof branches)[number];

  const results = await Promise.all(
    branches.map(async (branch: BranchRow) => {
      const [inStockCount, sales] = await Promise.all([
        prisma.phone.count({ where: { branchId: branch.id, status: "IN_STOCK" } }),
        prisma.sale.findMany({
          where: { branchId: branch.id, saleDate: { gte: monthStart }, returnedAt: null },
          select: {
            finalPrice: true,
            currency: true,
            phone: { select: { costPrice: true, currency: true } },
          },
        }),
      ]);

      type CompareSaleRow = (typeof sales)[number];

      const revenue = sales.reduce(
        (sum: number, s: CompareSaleRow) =>
          sum + toUZS(Number(s.finalPrice), s.currency, usdRate),
        0
      );
      const profit = sales.reduce(
        (sum: number, s: CompareSaleRow) =>
          sum +
          toUZS(Number(s.finalPrice), s.currency, usdRate) -
          toUZS(Number(s.phone.costPrice), s.phone.currency, usdRate),
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
  const [usdRate, branches] = await Promise.all([
    getUsdRate(),
    prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  type DailyBranchRow = (typeof branches)[number];

  const stats = await Promise.all(
    branches.map(async (branch: DailyBranchRow) => {
      const [inStockCount, salesToday] = await Promise.all([
        prisma.phone.count({ where: { branchId: branch.id, status: "IN_STOCK" } }),
        prisma.sale.findMany({
          where: { branchId: branch.id, saleDate: { gte: dayStart }, returnedAt: null },
          select: {
            finalPrice: true,
            currency: true,
            phone: { select: { costPrice: true, currency: true } },
          },
        }),
      ]);

      type DailySaleRow = (typeof salesToday)[number];

      const revenueTotal = salesToday.reduce(
        (sum: number, s: DailySaleRow) =>
          sum + toUZS(Number(s.finalPrice), s.currency, usdRate),
        0
      );
      const profitTotal = salesToday.reduce(
        (sum: number, s: DailySaleRow) =>
          sum +
          toUZS(Number(s.finalPrice), s.currency, usdRate) -
          toUZS(Number(s.phone.costPrice), s.phone.currency, usdRate),
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

  const [usdRate, sales] = await Promise.all([
    getUsdRate(),
    prisma.sale.findMany({
      where: { branchId, saleDate: { gte: rangeStart }, returnedAt: null },
      select: {
        finalPrice: true,
        currency: true,
        saleDate: true,
        phone: { select: { costPrice: true, currency: true } },
      },
    }),
  ]);

  const byDay = new Map<string, { revenue: number; profit: number }>();
  for (const sale of sales) {
    const key = startOfDay(sale.saleDate).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { revenue: 0, profit: 0 };
    const revenue = toUZS(Number(sale.finalPrice), sale.currency, usdRate);
    const cost = toUZS(Number(sale.phone.costPrice), sale.phone.currency, usdRate);
    entry.revenue += revenue;
    entry.profit += revenue - cost;
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

  const [usdRate, sales] = await Promise.all([
    getUsdRate(),
    prisma.sale.findMany({
      where: { branchId, saleDate: { gte: monthStart }, returnedAt: null },
      select: {
        finalPrice: true,
        currency: true,
        seller: { select: { id: true, name: true } },
        phone: { select: { costPrice: true, currency: true } },
      },
    }),
  ]);

  const grouped = new Map<
    string,
    { sellerId: string; sellerName: string; count: number; revenue: number; profit: number }
  >();

  for (const sale of sales) {
    const existing = grouped.get(sale.seller.id);
    const revenue = toUZS(Number(sale.finalPrice), sale.currency, usdRate);
    const profit =
      revenue - toUZS(Number(sale.phone.costPrice), sale.phone.currency, usdRate);

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

  const [usdRate, sales] = await Promise.all([
    getUsdRate(),
    prisma.sale.findMany({
      where: { branchId, returnedAt: null },
      orderBy: { saleDate: "desc" },
      select: {
        id: true,
        finalPrice: true,
        currency: true,
        saleDate: true,
        phone: { select: { model: true, brand: true, costPrice: true, currency: true } },
      },
    }),
  ]);

  type ProfitSaleRow = (typeof sales)[number];

  // Jadval yagona valyutada (so'mda) ko'rsatiladi — aralash valyutali
  // qatorlar ham taqqoslanadigan bo'lishi uchun.
  const rows = sales.map((sale: ProfitSaleRow) => {
    const salePrice = toUZS(Number(sale.finalPrice), sale.currency, usdRate);
    const costPrice = toUZS(Number(sale.phone.costPrice), sale.phone.currency, usdRate);
    return {
      id: sale.id,
      model: `${sale.phone.brand} ${sale.phone.model}`,
      saleDate: sale.saleDate,
      salePrice,
      costPrice,
      profit: salePrice - costPrice,
    };
  });

  type ProfitRow = (typeof rows)[number];

  const totalProfit = rows.reduce(
    (sum: number, r: ProfitRow) => sum + r.profit,
    0
  );

  return { rows, totalProfit };
}

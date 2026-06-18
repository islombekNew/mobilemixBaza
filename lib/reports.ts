import prisma from "@/lib/prisma";
import { assertBranchAccess, assertOwner, type SessionUser } from "@/lib/access-control";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * PRD 3.4: Filial bosh sahifasi (dashboard).
 * "Omborda qolgan mahsulotlar", "Shu oy kirgan/chiqgan mahsulotlar",
 * "Shu oy foyda", "eng ko'p sotilgan model, eng yuqori sotuv kuni"
 */
export async function getBranchDashboard(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  const monthStart = startOfMonth();

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

/** PRD 3.7: "Foyda hisobi (sotuv narxi − tan narxi, har bir sotuv va umumiy)" */
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

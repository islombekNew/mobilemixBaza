import { NextRequest, NextResponse } from "next/server";
import { getSystemOwnerUser } from "@/lib/access-control";
import { getDailySummaryAllBranches } from "@/lib/reports";
import { getAllOverdueCustomers } from "@/lib/customers";
import { notifyDailySummary } from "@/lib/telegram-notify";

/**
 * Kunlik hisobot — Vercel Cron orqali har kuni bir marta chaqiriladi
 * (vercel.json: "0 4 * * *" — UTC 04:00 = Toshkent vaqti 09:00).
 *
 * Xavfsizlik: Vercel CRON_SECRET'ni avtomatik "Authorization: Bearer ..."
 * header sifatida yuboradi (https://vercel.com/docs/cron-jobs/manage-cron-jobs).
 * Boshqa hech kim bu endpoint'ni shu header'siz chaqira olmaydi.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const owner = await getSystemOwnerUser();

    const [branchStats, overdueCustomers] = await Promise.all([
      getDailySummaryAllBranches(owner),
      getAllOverdueCustomers(owner),
    ]);

    const totalOverdueDebt = overdueCustomers.reduce(
      (sum, c) => sum + (Number(c.totalAmount) - Number(c.paidAmount)),
      0
    );

    await notifyDailySummary(branchStats, totalOverdueDebt, overdueCustomers.length);

    return NextResponse.json({ ok: true, branchCount: branchStats.length });
  } catch (error) {
    console.error("[cron/daily-report] Xatolik:", error);
    return NextResponse.json({ ok: false, error: "Hisobotni tayyorlashda xatolik" }, { status: 500 });
  }
}

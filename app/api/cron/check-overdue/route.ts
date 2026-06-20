import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSystemOwnerUser } from "@/lib/access-control";
import { syncOverdueStatuses } from "@/lib/customers";

/**
 * Muddati o'tgan qarzlarni tekshirish — Vercel Cron orqali har 3 soatda
 * chaqiriladi (vercel.json: "0 *\/3 * * *"). Bu sahifa ochilmagan paytlarda
 * ham (masalan, tunda) muddati o'tgan mijozlar o'z vaqtida OVERDUE
 * statusiga o'tib, admin Telegram orqali xabardor bo'lishini ta'minlaydi
 * (syncOverdueStatuses ichida — lib/customers.ts).
 *
 * Xavfsizlik: daily-report bilan bir xil — CRON_SECRET orqali.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const owner = await getSystemOwnerUser();
    const branches = await prisma.branch.findMany({ select: { id: true } });

    for (const branch of branches) {
      await syncOverdueStatuses(owner, branch.id);
    }

    return NextResponse.json({ ok: true, checkedBranches: branches.length });
  } catch (error) {
    console.error("[cron/check-overdue] Xatolik:", error);
    return NextResponse.json({ ok: false, error: "Tekshirishda xatolik" }, { status: 500 });
  }
}

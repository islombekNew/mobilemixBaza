import { NextRequest, NextResponse } from "next/server";
import { refreshUsdRate } from "@/lib/exchange-rate";

/**
 * USD/UZS kursini CBU'dan yangilash — Vercel Cron orqali har SOATDA
 * chaqiriladi (vercel.json: "0 * * * *"). Shu tariqa kurs kun davomida
 * o'zgarsa ham (Markaziy bank yangilasa) tizim eng so'nggisini biladi,
 * hech kim sahifa ochmasa ham.
 *
 * Xavfsizlik: boshqa cron'lar bilan bir xil — CRON_SECRET orqali.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await refreshUsdRate();

  if (rate === null) {
    // CBU ishlamadi — eski kurs saqlanib qoladi, xato emas
    return NextResponse.json({ ok: false, note: "CBU javob bermadi, eski kurs saqlandi" });
  }

  return NextResponse.json({ ok: true, usdToUzs: rate });
}

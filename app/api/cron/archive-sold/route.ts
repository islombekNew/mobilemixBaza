import { NextRequest, NextResponse } from "next/server";
import { archiveLastMonthSoldPhones } from "@/lib/phones";
import { notifySecurityEvent } from "@/lib/telegram-notify";

/**
 * Oylik ombor arxivlash — Vercel Cron orqali har oyning 1-kunida
 * chaqiriladi (vercel.json: "10 0 1 * *"). O'tgan oy(lar)da sotilgan
 * telefonlar arxivga o'tadi va ombor ro'yxati toza boshlanadi.
 *
 * MUHIM: hech narsa O'CHIRILMAYDI — faqat archivedAt belgilanadi.
 * Arxivni ombor sahifasidagi "Arxiv" tugmasi orqali ko'rish mumkin.
 *
 * Xavfsizlik: boshqa cron'lar bilan bir xil — CRON_SECRET orqali.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const archivedCount = await archiveLastMonthSoldPhones();

    if (archivedCount > 0) {
      void notifySecurityEvent("Oylik ombor arxivlandi", [
        `O'tgan oyda sotilgan ${archivedCount} ta telefon arxivga o'tkazildi.`,
        `Ular ombor ro'yxatida ko'rinmaydi, ammo hisobotlarda saqlanadi.`,
      ]).catch((error: unknown) =>
        console.error("[cron/archive-sold] Bildirishnoma xatosi:", error)
      );
    }

    return NextResponse.json({ ok: true, archivedCount });
  } catch (error) {
    console.error("[cron/archive-sold] Xatolik:", error);
    return NextResponse.json(
      { ok: false, error: "Arxivlashda xatolik" },
      { status: 500 }
    );
  }
}

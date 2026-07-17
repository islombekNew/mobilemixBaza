import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Tizim sog'lig'ini tekshirish (diagnostika). CRON_SECRET bilan himoyalangan —
 * ochiq emas. Muammo chiqqanda "nima ishlamayapti?" degan savolga aniq javob
 * beradi: baza qaysi hostga ulanyapti, so'rov o'tyaptimi, sozlamalar bormi.
 *
 * Parol/token HECH QACHON chiqarilmaydi — faqat host nomi va bor/yo'q holati.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /** URL'dan faqat host qismini oladi (parolsiz). */
  function hostOf(raw: string | undefined): string {
    if (!raw) return "YO'Q";
    try {
      return new URL(raw).host;
    } catch {
      return "NOTO'G'RI FORMAT";
    }
  }

  const report: Record<string, unknown> = {
    dbHost: hostOf(process.env.DATABASE_URL),
    directHost: hostOf(process.env.DIRECT_URL),
    hasPgbouncer: (process.env.DATABASE_URL ?? "").includes("pgbouncer=true"),
    hasConnectTimeout: (process.env.DATABASE_URL ?? "").includes("connect_timeout"),
    env: {
      TELEGRAM_BOT_TOKEN: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      TELEGRAM_ADMIN_CHAT_ID: Boolean(process.env.TELEGRAM_ADMIN_CHAT_ID),
      TELEGRAM_SHOP_BOT_TOKEN: Boolean(process.env.TELEGRAM_SHOP_BOT_TOKEN),
      TELEGRAM_SHOP_WEBHOOK_SECRET: Boolean(process.env.TELEGRAM_SHOP_WEBHOOK_SECRET),
      AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    },
    region: process.env.VERCEL_REGION ?? "noma'lum",
  };

  // 1) Baza ulanishi
  const t0 = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    report.db = { ok: true, ms: Date.now() - t0 };
  } catch (error) {
    report.db = {
      ok: false,
      ms: Date.now() - t0,
      error: error instanceof Error ? error.message.split("\n").filter(Boolean)[0] : String(error),
    };
    return NextResponse.json(report, { status: 500 });
  }

  // 2) Ma'lumotlar bormi
  try {
    const [owners, branches, phones] = await Promise.all([
      prisma.user.count({ where: { role: "OWNER", deletedAt: null } }),
      prisma.branch.count({ where: { archivedAt: null } }),
      prisma.phone.count(),
    ]);
    report.data = { owners, branches, phones };
  } catch (error) {
    report.data = {
      error: error instanceof Error ? error.message.split("\n").filter(Boolean)[0] : String(error),
    };
  }

  // 3) CBU (dollar kursi) manbai Vercel'dan ochiladimi
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 8000);
    const res = await fetch("https://cbu.uz/oz/arkhiv-kursov-valyut/json/USD/", {
      signal: c.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    report.cbu = { ok: res.ok, status: res.status };
  } catch (error) {
    report.cbu = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json(report);
}

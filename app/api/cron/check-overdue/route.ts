import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSystemOwnerUser } from "@/lib/access-control";
import {
  syncOverdueStatuses,
  getDueTodayCustomers,
  getAllOverdueCustomers,
} from "@/lib/customers";
import { notifyDebtReminders } from "@/lib/telegram-notify";

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

    // Kunlik qarz eslatmasi: bugun muddati kelganlar + muddati o'tganlar
    // bitta xabarda barcha adminlarga (statuslar yangilangandan KEYIN,
    // shu kunda OVERDUE bo'lganlar ham ro'yxatga tushishi uchun).
    const [dueToday, overdue] = await Promise.all([
      getDueTodayCustomers(owner),
      getAllOverdueCustomers(owner),
    ]);

    const toReminder = (c: (typeof dueToday)[number]) => ({
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      remainingDebt: Number(c.totalAmount) - Number(c.paidAmount),
      currency: c.currency,
      dueDate: c.dueDate,
      branchName: c.sale.branch.name,
    });

    await notifyDebtReminders(dueToday.map(toReminder), overdue.map(toReminder));

    return NextResponse.json({
      ok: true,
      checkedBranches: branches.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
    });
  } catch (error) {
    console.error("[cron/check-overdue] Xatolik:", error);
    return NextResponse.json({ ok: false, error: "Tekshirishda xatolik" }, { status: 500 });
  }
}

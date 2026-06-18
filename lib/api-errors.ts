import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/access-control";

/**
 * Barcha API route'lar uchun yagona xato javobi.
 * Avval har bir route o'zi `error.message`ni to'g'ridan-to'g'ri
 * foydalanuvchiga qaytarardi — bu Prisma'ning ichki xato matnlarini
 * (masalan, "Unique constraint failed on the fields: (imei)") oshkor
 * qilardi. Endi bunday xatolar tushunarli, xavfsiz xabarlarga aylantiriladi.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Kiritilgan ma'lumotlar noto'g'ri",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(", ")
        : "ma'lumot";
      return NextResponse.json(
        { error: `Bu ${target} bilan yozuv allaqachon mavjud` },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Yozuv topilmadi" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Ma'lumotlar bazasida xatolik yuz berdi" },
      { status: 400 }
    );
  }

  // Biz o'zimiz `throw new Error("...")` orqali tashlagan, foydalanuvchiga
  // ko'rsatish uchun mo'ljallangan xabarlar (masalan, "Bu telefon
  // allaqachon sotilgan") shu yerga tushadi — ular xavfsiz.
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("Kutilmagan xatolik:", error);
  return NextResponse.json({ error: "Noma'lum xatolik yuz berdi" }, { status: 500 });
}

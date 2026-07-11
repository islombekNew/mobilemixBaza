import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * PRD 4.3: "Har bir API so'rovida foydalanuvchi roli va filialga
 * tegishliligi tekshiriladi (seller boshqa filial ma'lumotiga so'rov
 * yubora olmasligi kerak — backend darajasida himoyalanadi)"
 *
 * Bu yordamchi funksiyalar har bir API route'da seller/owner
 * huquqlarini tekshirish uchun ishlatiladi.
 */

export interface SessionUser {
  id: string;
  role: Role;
  branchId: string | null;
}

export class ForbiddenError extends Error {
  constructor(message = "Bu amalni bajarish huquqingiz yo'q") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Owner barcha filiallarni ko'radi; seller faqat o'zinikini. */
export function assertBranchAccess(user: SessionUser, targetBranchId: string) {
  if (user.role === "OWNER") return;
  if (user.role === "SELLER" && user.branchId === targetBranchId) return;
  throw new ForbiddenError("Bu filial ma'lumotlariga kirish huquqingiz yo'q");
}

export function assertOwner(user: SessionUser) {
  if (user.role !== "OWNER") {
    throw new ForbiddenError("Bu amal faqat egasi (owner) uchun");
  }
}

/**
 * Tan narxi (costPrice) faqat owner va shu telefonni qo'shgan
 * seller uchun ko'rinadi (PRD 3.3 jadvali).
 */
export function canViewCostPrice(user: SessionUser, addedById: string) {
  return user.role === "OWNER" || user.id === addedById;
}

/**
 * Sahifalarda URL'dagi ?branchId= so'rov parametri foydalanuvchi tomonidan
 * erkin o'zgartirilishi mumkin. Bu funksiya har doim foydalanuvchi UCHUN
 * RUXSAT ETILGAN filialni qaytaradi — seller hech qachon boshqa filialga
 * tegishli branchId bilan keyingi funksiyalarni (masalan, yon ta'siri bor
 * syncOverdueStatuses) chaqira olmaydi, chunki noto'g'ri qiymat hatto
 * funksiyaga yetib bormaydi (assertBranchAccess bilan birga ishlatiladi —
 * ikkala qatlam ham himoya qiladi).
 */
export function resolveBranchId(
  user: SessionUser,
  accessibleBranchIds: string[],
  requestedBranchId?: string | null
): string | null {
  if (user.role === "OWNER") {
    if (requestedBranchId && accessibleBranchIds.includes(requestedBranchId)) {
      return requestedBranchId;
    }
    return accessibleBranchIds[0] ?? null;
  }
  // SELLER: so'rovdagi branchId e'tiborga olinmaydi, faqat o'z filiali.
  return user.branchId ?? null;
}

/**
 * Telegram bot (webhook) va cron job'lar haqiqiy login qilingan foydalanuvchi
 * sifatida emas, balki "tizim" sifatida ishlaydi — lekin baribir bazadagi
 * HAQIQIY bir OWNER hisobi orqali (audit log'larda foreign key buzilmasligi
 * uchun). Shu sababli har doim DB'dan birinchi OWNER topiladi.
 *
 * Bu funksiya faqat ICHKI (server-side) avtomatlashtirish uchun — hech
 * qachon foydalanuvchi so'rovi orqali (masalan, biror API route'da
 * to'g'ridan-to'g'ri) chaqirilmaydi.
 */
export async function getSystemOwnerUser(): Promise<SessionUser> {
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", deletedAt: null },
    select: { id: true },
  });

  if (!owner) {
    throw new Error("Tizimda hech qanday OWNER hisobi topilmadi");
  }

  return { id: owner.id, role: "OWNER", branchId: null };
}

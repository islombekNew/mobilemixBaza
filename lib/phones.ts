import prisma from "@/lib/prisma";
import {
  assertBranchAccess,
  assertOwner,
  canViewCostPrice,
  type SessionUser,
} from "@/lib/access-control";
import type { PhoneCondition, PhoneStatus, Prisma } from "@prisma/client";
import { notifySecurityEvent } from "@/lib/telegram-notify";
import { uploadPhonePhoto, deletePhonePhoto } from "@/lib/blob-storage";
import type { PhoneImportRow } from "@/lib/validation";

export interface PhoneFilters {
  search?: string; // model, brend, IMEI bo'yicha
  brand?: string;
  condition?: PhoneCondition;
  status?: PhoneStatus;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Filialga tegishli telefonlar ro'yxati, filtrlash bilan.
 * PRD 3.3: "Qidiruv va filtrlash: model, brend, holat, narx oralig'i, status bo'yicha"
 * PRD 3.3: "IMEI bo'yicha tezkor qidiruv"
 */
export async function listPhones(
  user: SessionUser,
  branchId: string,
  filters: PhoneFilters = {}
) {
  assertBranchAccess(user, branchId);

  const where: Prisma.PhoneWhereInput = { branchId, deletedAt: null };

  if (filters.search) {
    where.OR = [
      { model: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } },
      { imei: { contains: filters.search } },
    ];
  }
  if (filters.brand) where.brand = filters.brand;
  if (filters.condition) where.condition = filters.condition;
  if (filters.status) where.status = filters.status;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.salePrice = {};
    if (filters.minPrice !== undefined) where.salePrice.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.salePrice.lte = filters.maxPrice;
  }

  const phones = await prisma.phone.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { addedBy: { select: { id: true, name: true } } },
  });

  // PRD 3.3: tan narxi faqat owner va shu telefonni qo'shgan seller ko'radi
  return phones.map((phone: (typeof phones)[number]) => ({
    ...phone,
    costPrice: canViewCostPrice(user, phone.addedById) ? phone.costPrice : null,
  }));
}

export interface CreatePhoneInput {
  model: string;
  brand: string;
  color: string;
  storageGB: number;
  imei: string;
  condition: PhoneCondition;
  costPrice: number;
  salePrice: number;
  branchId: string;
}

/** PRD 3.3: "IMEI raqami: Har bir qurilma uchun unikal" + takror oldini olish */
export async function createPhone(user: SessionUser, input: CreatePhoneInput) {
  assertBranchAccess(user, input.branchId);

  // IMEI faqat "hali o'chirilmagan" (deletedAt: null) telefonlar orasida
  // noyob bo'lishi shart — shuning uchun findUnique emas, findFirst
  // (DB darajasida ham xuddi shu mantiq partial unique index orqali
  // ta'minlangan, bu yerdagi tekshiruv esa tezroq, tushunarli xabar beradi).
  const existing = await prisma.phone.findFirst({
    where: { imei: input.imei, deletedAt: null },
  });
  if (existing) {
    throw new Error("Bu IMEI raqami bilan telefon allaqachon mavjud");
  }

  const phone = await prisma.phone.create({
    data: {
      model: input.model,
      brand: input.brand,
      color: input.color,
      storageGB: input.storageGB,
      imei: input.imei,
      condition: input.condition,
      costPrice: input.costPrice,
      salePrice: input.salePrice,
      branchId: input.branchId,
      addedById: user.id,
      status: "IN_STOCK",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PHONE_CREATED",
      userId: user.id,
      branchId: input.branchId,
      details: { phoneId: phone.id, imei: phone.imei, model: phone.model },
    },
  });

  return phone;
}

export interface UpdatePhoneInput {
  model?: string;
  brand?: string;
  color?: string;
  storageGB?: number;
  condition?: PhoneCondition;
  costPrice?: number;
  salePrice?: number;
}

/** PRD 3.3: "Mavjud telefonni tahrirlash — owner va seller ikkisi ham" */
export async function updatePhone(
  user: SessionUser,
  phoneId: string,
  input: UpdatePhoneInput
) {
  const phone = await prisma.phone.findUnique({ where: { id: phoneId } });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.deletedAt) throw new Error("Bu telefon o'chirilgan");

  assertBranchAccess(user, phone.branchId);

  const updated = await prisma.phone.update({
    where: { id: phoneId },
    data: input,
  });

  await prisma.auditLog.create({
    data: {
      action: "PHONE_UPDATED",
      userId: user.id,
      branchId: phone.branchId,
      details: { phoneId, changes: input },
    },
  });

  return updated;
}

/**
 * PRD 3.3: "Telefonni o'chirish (faqat hali sotilmagan bo'lsa)"
 *
 * SOFT-DELETE: yozuv bazadan butunlay o'chirilmaydi, faqat `deletedAt`
 * to'ldiriladi va ro'yxatlarda (listPhones) ko'rinmay qoladi. Bu —
 * tarixiy hisobotlar (masalan, eski sotuvlar, audit log) buzilib
 * qolmasligi uchun muhim: agar Phone yozuvi chindan o'chirilsa, unga
 * bog'langan eski Sale/AuditLog yozuvlari "qaysi telefon edi?" deb
 * so'raganda hech narsa topa olmay qolardi.
 */
export async function deletePhone(user: SessionUser, phoneId: string) {
  const phone = await prisma.phone.findUnique({
    where: { id: phoneId },
    include: { branch: { select: { name: true } }, addedBy: { select: { name: true } } },
  });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.deletedAt) throw new Error("Bu telefon allaqachon o'chirilgan");

  assertBranchAccess(user, phone.branchId);

  if (phone.status === "SOLD") {
    throw new Error("Sotilgan telefonni o'chirish mumkin emas");
  }

  await prisma.phone.update({
    where: { id: phoneId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: "PHONE_DELETED",
      userId: user.id,
      branchId: phone.branchId,
      details: { phoneId, imei: phone.imei, model: phone.model },
    },
  });

  // Telefon o'chirilishi qaytarib bo'lmaydigan amal — admin doim xabardor
  // bo'lishi kerak (kim, qaysi filialda, qaysi IMEI'ni o'chirgani).
  void notifySecurityEvent("Telefon o'chirildi", [
    `Model: ${phone.brand} ${phone.model}`,
    `IMEI: ${phone.imei}`,
    `Filial: ${phone.branch.name}`,
    `Qo'shgan: ${phone.addedBy.name}`,
  ]).catch((error: unknown) =>
    console.error("[phones] O'chirish bildirishnomasi xatosi:", error)
  );

  // Rasm endi kerak emas — saqlash joyini bo'shatamiz (yozuvning o'zi
  // tarix uchun bazada qolaveradi).
  if (phone.photoUrl) {
    void deletePhonePhoto(phone.photoUrl);
  }
}

/**
 * Telefonga rasm qo'shadi/almashtiradi (Vercel Blob orqali).
 * Eski rasm bo'lsa, avval o'chirib, keyin yangisini yozadi.
 */
export async function setPhonePhoto(user: SessionUser, phoneId: string, file: File) {
  const phone = await prisma.phone.findUnique({ where: { id: phoneId } });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.deletedAt) throw new Error("Bu telefon o'chirilgan");

  assertBranchAccess(user, phone.branchId);

  const result = await uploadPhonePhoto(phoneId, file);
  if (!result.ok || !result.url) {
    throw new Error(result.error ?? "Rasmni yuklashda xatolik yuz berdi");
  }

  const oldPhotoUrl = phone.photoUrl;

  const updated = await prisma.phone.update({
    where: { id: phoneId },
    data: { photoUrl: result.url },
  });

  if (oldPhotoUrl) {
    void deletePhonePhoto(oldPhotoUrl);
  }

  return updated;
}

/** Telefondan rasmni butunlay olib tashlaydi. */
export async function removePhonePhoto(user: SessionUser, phoneId: string) {
  const phone = await prisma.phone.findUnique({ where: { id: phoneId } });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.deletedAt) throw new Error("Bu telefon o'chirilgan");

  assertBranchAccess(user, phone.branchId);

  if (!phone.photoUrl) return phone;

  const updated = await prisma.phone.update({
    where: { id: phoneId },
    data: { photoUrl: null },
  });

  void deletePhonePhoto(phone.photoUrl);

  return updated;
}

/**
 * Telefonni bir filialdan boshqasiga ko'chiradi (omborlar orasida tovar
 * almashtirish). Faqat OWNER bajara oladi — seller faqat o'z filiali
 * doirasida ishlaydi, filiallar orasidagi qarorni faqat egasi qabul qiladi.
 */
export async function transferPhone(
  user: SessionUser,
  phoneId: string,
  targetBranchId: string
) {
  assertOwner(user);

  const phone = await prisma.phone.findUnique({
    where: { id: phoneId },
    include: { branch: { select: { name: true } } },
  });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.deletedAt) throw new Error("Bu telefon o'chirilgan");

  if (phone.status === "SOLD") {
    throw new Error("Sotilgan telefonni ko'chirib bo'lmaydi");
  }
  if (phone.branchId === targetBranchId) {
    throw new Error("Telefon allaqachon shu filialda");
  }

  const targetBranch = await prisma.branch.findUnique({
    where: { id: targetBranchId },
  });
  if (!targetBranch) throw new Error("Maqsad filial topilmadi");

  const updated = await prisma.$transaction(async (tx) => {
    const moved = await tx.phone.update({
      where: { id: phoneId },
      data: { branchId: targetBranchId },
    });

    await tx.auditLog.create({
      data: {
        action: "PHONE_TRANSFERRED",
        userId: user.id,
        branchId: targetBranchId,
        details: {
          phoneId,
          imei: phone.imei,
          model: phone.model,
          fromBranchId: phone.branchId,
          fromBranchName: phone.branch.name,
          toBranchId: targetBranchId,
          toBranchName: targetBranch.name,
        },
      },
    });

    return moved;
  });

  void notifySecurityEvent("Telefon filiallar orasida ko'chirildi", [
    `Model: ${phone.brand} ${phone.model}`,
    `IMEI: ${phone.imei}`,
    `${phone.branch.name} -> ${targetBranch.name}`,
  ]).catch((error: unknown) =>
    console.error("[phones] Ko'chirish bildirishnomasi xatosi:", error)
  );

  return updated;
}

export interface ImportSummary {
  created: number;
  skipped: { row: number; reason: string }[];
}

/**
 * Excel/CSV fayldan ulgurji telefon qo'shish. Har bir qator alohida
 * tekshiriladi — bitta qatordagi xato (masalan, takror IMEI) boshqa
 * qatorlarni to'xtatib qo'ymaydi, faqat "skipped" ro'yxatiga tushadi.
 *
 * `rows` allaqachon zod orqali tasdiqlangan bo'lishi kerak (route.ts'da).
 */
export async function bulkImportPhones(
  user: SessionUser,
  branchId: string,
  rows: PhoneImportRow[]
): Promise<ImportSummary> {
  assertBranchAccess(user, branchId);

  const summary: ImportSummary = { created: 0, skipped: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const existing = await prisma.phone.findFirst({
        where: { imei: row.imei, deletedAt: null },
      });
      if (existing) {
        summary.skipped.push({
          row: i + 1,
          reason: `IMEI "${row.imei}" allaqachon mavjud`,
        });
        continue;
      }

      const phone = await prisma.phone.create({
        data: {
          model: row.model,
          brand: row.brand,
          color: row.color,
          storageGB: row.storageGB,
          imei: row.imei,
          condition: row.condition,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          branchId,
          addedById: user.id,
          status: "IN_STOCK",
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "PHONE_IMPORTED",
          userId: user.id,
          branchId,
          details: { phoneId: phone.id, imei: phone.imei, model: phone.model },
        },
      });

      summary.created += 1;
    } catch (error) {
      summary.skipped.push({
        row: i + 1,
        reason: error instanceof Error ? error.message : "Noma'lum xatolik",
      });
    }
  }

  return summary;
}

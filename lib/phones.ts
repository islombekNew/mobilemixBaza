import prisma from "@/lib/prisma";
import {
  assertBranchAccess,
  canViewCostPrice,
  type SessionUser,
} from "@/lib/access-control";
import type { PhoneCondition, PhoneStatus, Prisma } from "@prisma/client";

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

  const where: Prisma.PhoneWhereInput = { branchId };

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

  const existing = await prisma.phone.findUnique({
    where: { imei: input.imei },
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
    // JSON.stringify ichiga oldik:
    details: JSON.stringify({ phoneId, changes: input }), 
  },
});

  return updated;
}

/** PRD 3.3: "Telefonni o'chirish (faqat hali sotilmagan bo'lsa)" */
export async function deletePhone(user: SessionUser, phoneId: string) {
  const phone = await prisma.phone.findUnique({ where: { id: phoneId } });
  if (!phone) throw new Error("Telefon topilmadi");

  assertBranchAccess(user, phone.branchId);

  if (phone.status === "SOLD") {
    throw new Error("Sotilgan telefonni o'chirish mumkin emas");
  }

  await prisma.phone.delete({ where: { id: phoneId } });

  await prisma.auditLog.create({
    data: {
      action: "PHONE_DELETED",
      userId: user.id,
      branchId: phone.branchId,
      details: { phoneId, imei: phone.imei, model: phone.model },
    },
  });
}

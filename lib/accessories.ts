import prisma from "@/lib/prisma";
import type { Currency, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/access-control";

/**
 * Aksesuarlar (g'ilof, zaryadnik...) — telefonlardan farqli ravishda IMEI'siz,
 * SONI (quantity) bilan yuritiladi: bir xil g'ilofdan 15 ta kelsa, bitta yozuv
 * quantity=15 bilan saqlanadi. Sotilganda soni kamaytiriladi.
 *
 * Aksesuarlar filialga bog'lanmagan (kichik va arzon tovar) — barcha
 * filiallar bitta umumiy ro'yxatni ko'radi.
 */

export interface AccessoryFilters {
  search?: string;
}

export async function listAccessories(_user: SessionUser, filters: AccessoryFilters = {}) {
  const where: Prisma.AccessoryWhereInput = { deletedAt: null };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { forModel: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.accessory.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export interface CreateAccessoryInput {
  name: string;
  forModel?: string | null;
  price: number;
  currency?: Currency;
  quantity?: number;
  description?: string | null;
}

/**
 * Yangi aksesuar qo'shish. Agar AYNAN bir xil nom + model + narx bilan
 * mavjud bo'lsa — yangi yozuv ochilmaydi, mavjudining SONI oshiriladi
 * ("kop kelgan bolsa boshidan qoshib otirmasin").
 */
export async function createAccessory(user: SessionUser, input: CreateAccessoryInput) {
  const quantity = input.quantity ?? 1;

  const existing = await prisma.accessory.findFirst({
    where: {
      deletedAt: null,
      name: { equals: input.name.trim(), mode: "insensitive" },
      forModel: input.forModel?.trim()
        ? { equals: input.forModel.trim(), mode: "insensitive" }
        : null,
    },
  });

  if (existing) {
    return {
      merged: true as const,
      accessory: await prisma.accessory.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: quantity },
          // Narx o'zgargan bo'lsa — yangisini olamiz
          price: input.price,
          currency: input.currency ?? existing.currency,
        },
      }),
    };
  }

  return {
    merged: false as const,
    accessory: await prisma.accessory.create({
      data: {
        name: input.name.trim(),
        forModel: input.forModel?.trim() || null,
        price: input.price,
        currency: input.currency ?? "UZS",
        quantity,
        description: input.description?.trim() || null,
      },
    }),
  };
}

export interface UpdateAccessoryInput {
  name?: string;
  forModel?: string | null;
  price?: number;
  currency?: Currency;
  quantity?: number;
  /** Soni ustiga qo'shish/ayirish uchun (masalan +5 yoki -1) */
  quantityDelta?: number;
  description?: string | null;
}

export async function updateAccessory(
  _user: SessionUser,
  id: string,
  input: UpdateAccessoryInput
) {
  const acc = await prisma.accessory.findUnique({ where: { id } });
  if (!acc || acc.deletedAt) throw new Error("Aksesuar topilmadi");

  const data: Prisma.AccessoryUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.forModel !== undefined) data.forModel = input.forModel?.trim() || null;
  if (input.price !== undefined) data.price = input.price;
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.description !== undefined) data.description = input.description?.trim() || null;

  if (input.quantity !== undefined) {
    data.quantity = Math.max(0, input.quantity);
  } else if (input.quantityDelta !== undefined) {
    data.quantity = Math.max(0, acc.quantity + input.quantityDelta);
  }

  return prisma.accessory.update({ where: { id }, data });
}

/** Soft-delete — yozuv tarix uchun qoladi, ro'yxatda/botda ko'rinmaydi. */
export async function deleteAccessory(_user: SessionUser, id: string) {
  const acc = await prisma.accessory.findUnique({ where: { id } });
  if (!acc || acc.deletedAt) throw new Error("Aksesuar topilmadi");

  return prisma.accessory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

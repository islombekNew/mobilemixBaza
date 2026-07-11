import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { assertOwner, type SessionUser } from "@/lib/access-control";
import type { Role, Prisma } from "@prisma/client";
import { getUsdRate } from "@/lib/exchange-rate";
import { toUZS } from "@/lib/currency";

export interface CreateUserInput {
  name: string;
  login: string;
  password: string;
  role: Role;
  branchId?: string | null;
}

/**
 * Xodim (seller) yoki yangi owner qo'shish.
 * Faqat OWNER bu amalni bajara oladi (PRD 4.2/4.3).
 */
export async function createUser(user: SessionUser, input: CreateUserInput) {
  assertOwner(user);

  if (input.role === "SELLER" && !input.branchId) {
    throw new Error("Sotuvchi uchun filial tanlanishi shart");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const branchId = input.role === "SELLER" ? input.branchId : null;

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        name: input.name,
        login: input.login,
        passwordHash,
        role: input.role,
        branchId,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "USER_CREATED",
        userId: user.id,
        branchId,
        details: { createdUserId: newUser.id, login: newUser.login, role: newUser.role },
      },
    });

    return newUser;
  });

  // Parol hash'i hech qachon klientga qaytarilmaydi
  const { passwordHash: _omit, ...safeUser } = created;
  return safeUser;
}

/** Xodimlar ro'yxati (faqat owner ko'ra oladi). Bloklanganlar ham ko'rinadi. */
export async function listUsers(user: SessionUser) {
  assertOwner(user);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { id: true, name: true } } },
  });

  return users.map(({ passwordHash: _passwordHash, ...rest }) => rest);
}

export interface UpdateUserInput {
  name?: string;
  login?: string;
  password?: string; // bo'sh/berilmagan bo'lsa — eski parol qoladi
  role?: Role;
  branchId?: string | null;
}

/**
 * Xodimni tahrirlash — faqat OWNER. Parol faqat yangi qiymat kiritilganda
 * almashadi. O'zining OWNER rolini pasaytirishga yo'l qo'yilmaydi (tizim
 * egasiz qolib ketmasligi uchun).
 */
export async function updateUser(
  user: SessionUser,
  userId: string,
  input: UpdateUserInput
) {
  assertOwner(user);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Xodim topilmadi");

  if (userId === user.id && input.role === "SELLER") {
    throw new Error("O'zingizning egalik rolingizni pasaytira olmaysiz");
  }

  const role = input.role ?? target.role;
  if (role === "SELLER" && !(input.branchId ?? target.branchId)) {
    throw new Error("Sotuvchi uchun filial tanlanishi shart");
  }

  // Login o'zgartirilsa — boshqa xodim bilan to'qnashmasligi tekshiriladi
  if (input.login && input.login !== target.login) {
    const clash = await prisma.user.findUnique({ where: { login: input.login } });
    if (clash) throw new Error("Bu login allaqachon band");
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.login !== undefined) data.login = input.login;
  if (input.role !== undefined) data.role = input.role;
  if (input.branchId !== undefined) {
    data.branch =
      role === "OWNER" || input.branchId === null
        ? { disconnect: true }
        : { connect: { id: input.branchId } };
  }
  if (role === "OWNER") data.branch = { disconnect: true };
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  await prisma.auditLog.create({
    data: {
      action: "USER_UPDATED",
      userId: user.id,
      branchId: updated.branchId,
      details: {
        targetUserId: userId,
        changedFields: Object.keys(input).filter(
          (k) => input[k as keyof UpdateUserInput] !== undefined
        ),
      },
    },
  });

  const { passwordHash: _omit, ...safeUser } = updated;
  return safeUser;
}

/**
 * Xodimni bloklash/blokdan chiqarish (soft-delete). Yozuv O'CHIRILMAYDI —
 * uning eski sotuvlari va audit tarixi buzilmasligi kerak. Bloklangan
 * xodim tizimga kira olmaydi (lib/auth.ts'da tekshiriladi).
 */
export async function setUserBlocked(
  user: SessionUser,
  userId: string,
  blocked: boolean
) {
  assertOwner(user);

  if (userId === user.id && blocked) {
    throw new Error("O'zingizni bloklay olmaysiz");
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Xodim topilmadi");

  // Oxirgi faol OWNER bloklansa — tizimga hech kim kira olmay qoladi
  if (blocked && target.role === "OWNER") {
    const activeOwners = await prisma.user.count({
      where: { role: "OWNER", deletedAt: null },
    });
    if (activeOwners <= 1) {
      throw new Error("Oxirgi faol egani bloklab bo'lmaydi");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: blocked ? new Date() : null },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_BLOCKED",
      userId: user.id,
      branchId: target.branchId,
      details: { targetUserId: userId, login: target.login, blocked },
    },
  });

  const { passwordHash: _omit, ...safeUser } = updated;
  return safeUser;
}

/**
 * Sotuv oynasida "kim sotyapti"ni tanlash uchun filialning faol
 * sotuvchilari + barcha faol owner'lar ro'yxati. Seller ham chaqira oladi
 * (o'z filiali uchun) — lekin UI'da faqat owner tanlay oladi.
 */
export async function listActiveSellersForBranch(
  user: SessionUser,
  branchId: string
) {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [{ role: "OWNER" }, { role: "SELLER", branchId }],
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });
  return users;
}

/**
 * Xodimlar sahifasi uchun: har bir xodimning SHU OY sotuv soni, tushumi va
 * foydasi (hammasi so'mga keltirilgan — aralash valyuta kurs orqali).
 * Qaytarilgan sotuvlar hisobga olinmaydi.
 */
export async function getMonthlySellerStats(user: SessionUser) {
  assertOwner(user);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sales, usdRate] = await Promise.all([
    prisma.sale.findMany({
      where: { saleDate: { gte: monthStart }, returnedAt: null },
      select: {
        sellerId: true,
        finalPrice: true,
        currency: true,
        phone: { select: { costPrice: true, currency: true } },
      },
    }),
    getUsdRate(),
  ]);

  const stats = new Map<string, { count: number; revenue: number; profit: number }>();
  for (const s of sales) {
    const entry = stats.get(s.sellerId) ?? { count: 0, revenue: 0, profit: 0 };
    const revenue = toUZS(Number(s.finalPrice), s.currency, usdRate);
    const cost = toUZS(Number(s.phone.costPrice), s.phone.currency, usdRate);
    entry.count += 1;
    entry.revenue += revenue;
    entry.profit += revenue - cost;
    stats.set(s.sellerId, entry);
  }

  return stats;
}

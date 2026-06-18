import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { assertOwner, type SessionUser } from "@/lib/access-control";
import type { Role, Prisma } from "@prisma/client";

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

/** Xodimlar ro'yxati (faqat owner ko'ra oladi). */
export async function listUsers(user: SessionUser) {
  assertOwner(user);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { id: true, name: true } } },
  });

  return users.map(({ passwordHash: _passwordHash, ...rest }) => rest);
}

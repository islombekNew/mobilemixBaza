import prisma from "@/lib/prisma";
import { assertOwner, type SessionUser } from "@/lib/access-control";

/**
 * Owner barcha filiallarni ko'radi; seller faqat o'zinikini (PRD 2.1, 2.2).
 */
export async function listBranches(user: SessionUser) {
  if (user.role === "OWNER") {
    // Arxivlangan filiallar ro'yxatda ko'rinmaydi (ma'lumoti bazada saqlanadi)
    return prisma.branch.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!user.branchId) return [];
  const branch = await prisma.branch.findUnique({ where: { id: user.branchId } });
  return branch && !branch.archivedAt ? [branch] : [];
}

export interface CreateBranchInput {
  name: string;
  address: string;
  phoneNumber: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phoneNumber?: string;
}

export async function updateBranch(user: SessionUser, branchId: string, input: UpdateBranchInput) {
  assertOwner(user);
  return prisma.branch.update({ where: { id: branchId }, data: input });
}

/**
 * Filialni o'chirish yoki arxivlash — faqat OWNER.
 *
 * Qoida: ichida hech qanday ma'lumot (telefon, sotuv, xodim) bo'lmagan
 * filial BUTUNLAY o'chiriladi. Ma'lumoti borlari esa faqat ARXIVLANADI —
 * ro'yxatlardan yo'qoladi, lekin sotuv tarixi, hisobotlar va audit log
 * buzilmasdan bazada qoladi.
 */
export async function deleteOrArchiveBranch(user: SessionUser, branchId: string) {
  assertOwner(user);

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Filial topilmadi");
  if (branch.archivedAt) throw new Error("Bu filial allaqachon arxivlangan");

  // Oxirgi faol filialni yo'qotib bo'lmaydi — CRM ishlashi uchun kamida
  // bitta filial kerak
  const activeCount = await prisma.branch.count({ where: { archivedAt: null } });
  if (activeCount <= 1) {
    throw new Error("Oxirgi filialni o'chirib bo'lmaydi — avval yangi filial qo'shing");
  }

  const [phoneCount, saleCount, userCount] = await Promise.all([
    prisma.phone.count({ where: { branchId } }),
    prisma.sale.count({ where: { branchId } }),
    // Bloklanganlar ham hisobga olinadi — ular ham FK orqali bog'langan
    prisma.user.count({ where: { branchId } }),
  ]);

  // Xodimi bor filialni yo'qotish xavfli — xodim tizimda "osilib" qoladi
  if (userCount > 0 && phoneCount === 0 && saleCount === 0) {
    throw new Error(
      `Bu filialga ${userCount} ta xodim biriktirilgan — avval ularni boshqa filialga o'tkazing`
    );
  }

  if (phoneCount === 0 && saleCount === 0) {
    // Butunlay bo'sh — xavfsiz o'chiriladi
    await prisma.$transaction([
      prisma.auditLog.create({
        data: {
          action: "BRANCH_DELETED",
          userId: user.id,
          details: { branchId, name: branch.name },
        },
      }),
      // Eski audit yozuvlari branchga bog'langan bo'lishi mumkin — avval uzamiz
      prisma.auditLog.updateMany({ where: { branchId }, data: { branchId: null } }),
      prisma.branch.delete({ where: { id: branchId } }),
    ]);
    return { deleted: true as const, archived: false as const };
  }

  // Ma'lumoti bor — faqat arxiv (hech narsa o'chmaydi)
  await prisma.branch.update({
    where: { id: branchId },
    data: { archivedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      action: "BRANCH_ARCHIVED",
      userId: user.id,
      branchId,
      details: { name: branch.name, phoneCount, saleCount },
    },
  });
  return { deleted: false as const, archived: true as const };
}

/** PRD 3.2: "Owner yangi filial qo'sha oladi" */
export async function createBranch(user: SessionUser, input: CreateBranchInput) {
  assertOwner(user);

  const branch = await prisma.branch.create({ data: input });

  await prisma.auditLog.create({
    data: {
      action: "BRANCH_CREATED",
      userId: user.id,
      branchId: branch.id,
      details: { name: branch.name },
    },
  });

  return branch;
}

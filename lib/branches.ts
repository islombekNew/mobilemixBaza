import prisma from "@/lib/prisma";
import { assertOwner, type SessionUser } from "@/lib/access-control";

/**
 * Owner barcha filiallarni ko'radi; seller faqat o'zinikini (PRD 2.1, 2.2).
 */
export async function listBranches(user: SessionUser) {
  if (user.role === "OWNER") {
    return prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
  }
  if (!user.branchId) return [];
  const branch = await prisma.branch.findUnique({ where: { id: user.branchId } });
  return branch ? [branch] : [];
}

export interface CreateBranchInput {
  name: string;
  address: string;
  phoneNumber: string;
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

import prisma from "@/lib/prisma";
import { assertBranchAccess, type SessionUser } from "@/lib/access-control";
import type { CustomerStatus, Prisma } from "@prisma/client";

export interface CustomerFilters {
  search?: string; // ism yoki telefon raqami bo'yicha
  status?: CustomerStatus;
  overdueOnly?: boolean;
}

/**
 * PRD 3.6: mijozlar ro'yxati, filial bo'yicha (Sale orqali bog'langan).
 * "Mijozni ism yoki telefon raqami bo'yicha qidirish"
 */
export async function listCustomers(
  user: SessionUser,
  branchId: string,
  filters: CustomerFilters = {}
) {
  assertBranchAccess(user, branchId);

  const where: Prisma.CustomerWhereInput = {
    sale: { branchId },
  };

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { phoneNumber: { contains: filters.search } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.overdueOnly) where.status = "OVERDUE";

  return prisma.customer.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: {
      sale: {
        include: { phone: { select: { model: true, brand: true, imei: true } } },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
}

export async function getCustomer(user: SessionUser, customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sale: {
        include: { phone: { select: { model: true, brand: true, imei: true } } },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!customer) throw new Error("Mijoz topilmadi");

  assertBranchAccess(user, customer.sale.branchId);
  return customer;
}

/**
 * PRD 3.6: "Yangi to'lov qo'shish (qisman to'lov kiritilganda qolgan
 * qarz avtomatik kamayadi)"
 */
export async function addDebtPayment(
  user: SessionUser,
  customerId: string,
  amount: number,
  note?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("To'lov summasi musbat son bo'lishi kerak");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { sale: true },
  });
  if (!customer) throw new Error("Mijoz topilmadi");

  assertBranchAccess(user, customer.sale.branchId);

  const newPaidAmount = Number(customer.paidAmount) + amount;
  const totalAmount = Number(customer.totalAmount);

  if (newPaidAmount > totalAmount) {
    throw new Error("To'lov summasi qolgan qarzdan ko'p bo'lishi mumkin emas");
  }

  const newStatus: CustomerStatus =
    newPaidAmount >= totalAmount ? "PAID" : "ACTIVE";

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.debtPayment.create({
      data: { customerId, amount, note },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: { paidAmount: newPaidAmount, status: newStatus },
    });

    await tx.auditLog.create({
      data: {
        action: "DEBT_PAYMENT_CREATED",
        userId: user.id,
        branchId: customer.sale.branchId,
        details: { customerId, amount },
      },
    });

    return { payment, customer: updatedCustomer };
  });

  return result;
}

/**
 * PRD 3.6: "Muddati o'tgan qarzlar ro'yxati alohida ko'rinadi"
 * dueDate o'tgan va hali to'liq to'lanmagan mijozlarni OVERDUE statusiga o'tkazadi.
 * Bu funksiya dashboard/mijozlar sahifasi yuklanganda chaqiriladi.
 *
 * MUHIM: bu funksiya bazani O'ZGARTIRADI (updateMany), shuning uchun
 * boshqa har qanday filialga tegishli yozish amali kabi ruxsat
 * tekshirilishi SHART. Avval bu yerda tekshiruv yo'q edi — seller
 * boshqa filialning branchId'sini yuborib, o'sha filial mijozlarining
 * statusini o'zgartirib yuborishi mumkin edi.
 */
export async function syncOverdueStatuses(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  await prisma.customer.updateMany({
    where: {
      sale: { branchId },
      status: "ACTIVE",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}

/** PRD 3.7: "Faol qarzlar umumiy summasi (filial va umumiy bo'yicha)" */
export async function getDebtSummary(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  const customers = await prisma.customer.findMany({
    where: {
      sale: { branchId },
      status: { in: ["ACTIVE", "OVERDUE"] },
    },
    select: { totalAmount: true, paidAmount: true, status: true },
  });

  type DebtRow = (typeof customers)[number];

  const totalDebt = customers.reduce(
    (sum: number, c: DebtRow) => sum + (Number(c.totalAmount) - Number(c.paidAmount)),
    0
  );
  const overdueCount = customers.filter(
    (c: DebtRow) => c.status === "OVERDUE"
  ).length;

  return { totalDebt, activeCount: customers.length, overdueCount };
}

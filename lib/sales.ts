import prisma from "@/lib/prisma";
import { assertBranchAccess, type SessionUser } from "@/lib/access-control";
import type { PaymentType, PaymentPlan, Prisma } from "@prisma/client";

export interface CreateSaleInput {
  phoneId: string;
  branchId: string;
  paymentType: PaymentType;
  finalPrice: number;
  // Faqat paymentType === "CREDIT" bo'lganda kerak (PRD 3.5, 3.6)
  customer?: {
    fullName: string;
    phoneNumber: string;
    totalAmount: number;
    paidAmount: number; // boshlang'ich to'lov, bo'lmasa 0
    dueDate: string | Date;
    paymentPlan: PaymentPlan;
  };
}

/**
 * PRD 3.5: Sotuv jarayoni.
 * - Naqd/karta: sotuv darhol yakunlanadi, telefon "sotilgan" statusiga o'tadi.
 * - Kredit: yuqoridagilarga qo'shimcha, Customer yozuvi yaratiladi.
 * Hammasi bitta tranzaksiyada bajariladi — yarim bajarilgan holat bo'lmasligi uchun.
 */
export async function createSale(user: SessionUser, input: CreateSaleInput) {
  assertBranchAccess(user, input.branchId);

  if (input.paymentType === "CREDIT" && !input.customer) {
    throw new Error("Kredit sotuv uchun mijoz ma'lumotlari kerak");
  }
  if (
    input.customer &&
    input.customer.paidAmount > input.customer.totalAmount
  ) {
    throw new Error("Boshlang'ich to'lov umumiy summadan ko'p bo'lishi mumkin emas");
  }

  // Tezkor, foydalanuvchiga qulay xabar uchun dastlabki tekshiruv.
  // (Yakuniy, ishonchli tekshiruv tranzaksiya ICHIDA, pastda qayta bajariladi —
  // ikki sotuvchi bir vaqtning o'zida bitta telefonni sotmoqchi bo'lsa, race
  // condition oldini olish uchun.)
  const phone = await prisma.phone.findUnique({ where: { id: input.phoneId } });
  if (!phone) throw new Error("Telefon topilmadi");
  if (phone.branchId !== input.branchId) {
    throw new Error("Telefon boshqa filialga tegishli");
  }
  if (phone.status === "SOLD") {
    throw new Error("Bu telefon allaqachon sotilgan");
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Telefon holatini tranzaksiya ICHIDA qayta tekshirish (race condition
    //    himoyasi: ikki so'rov bir vaqtda kelsa, ikkinchisi shu yerda to'xtaydi,
    //    xom Prisma unique-constraint xatosi o'rniga tushunarli xabar bilan).
    const freshPhone = await tx.phone.findUnique({ where: { id: input.phoneId } });
    if (!freshPhone || freshPhone.status === "SOLD") {
      throw new Error("Bu telefon allaqachon sotilgan");
    }

    // 2. Telefon statusini o'zgartirish
    await tx.phone.update({
      where: { id: input.phoneId },
      data: { status: "SOLD" },
    });

    // 3. Sotuv yozuvini yaratish (PRD 3.5: "kim sotgani, qaysi filialdan, sana va vaqt saqlanadi")
    const sale = await tx.sale.create({
      data: {
        phoneId: input.phoneId,
        sellerId: user.id,
        branchId: input.branchId,
        finalPrice: input.finalPrice,
        paymentType: input.paymentType,
      },
    });

    // 4. Agar kredit bo'lsa — mijoz yozuvi (PRD 3.6: "faqat kreditga sotuv bo'lganda yaratiladi")
    let customer = null;
    if (input.paymentType === "CREDIT" && input.customer) {
      const status =
        input.customer.paidAmount >= input.customer.totalAmount ? "PAID" : "ACTIVE";

      customer = await tx.customer.create({
        data: {
          fullName: input.customer.fullName,
          phoneNumber: input.customer.phoneNumber,
          totalAmount: input.customer.totalAmount,
          paidAmount: input.customer.paidAmount,
          dueDate: new Date(input.customer.dueDate),
          paymentPlan: input.customer.paymentPlan,
          status,
          saleId: sale.id,
        },
      });
    }

    // 5. Audit log (PRD 4.3)
    await tx.auditLog.create({
      data: {
        action: "SALE_CREATED",
        userId: user.id,
        branchId: input.branchId,
        details: {
          saleId: sale.id,
          phoneId: input.phoneId,
          paymentType: input.paymentType,
          finalPrice: input.finalPrice,
        },
      },
    });

    return { sale, customer };
  });

  return result;
}

/**
 * Filial bo'yicha sotuvlar tarixi (eng so'nggilari birinchi).
 */
export async function listSales(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  return prisma.sale.findMany({
    where: { branchId },
    orderBy: { saleDate: "desc" },
    include: {
      phone: { select: { model: true, brand: true, imei: true } },
      seller: { select: { name: true } },
      customer: { select: { fullName: true, status: true } },
    },
  });
}

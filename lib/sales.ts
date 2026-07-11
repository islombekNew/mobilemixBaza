import prisma from "@/lib/prisma";
import { assertBranchAccess, type SessionUser } from "@/lib/access-control";
import type { Currency, PaymentType, PaymentPlan, Prisma } from "@prisma/client";
import { notifyCreditSale, notifySecurityEvent } from "@/lib/telegram-notify";
import { maybePostSoldBatch } from "@/lib/telegram-channel";

export interface CreateSaleInput {
  phoneId: string;
  branchId: string;
  paymentType: PaymentType;
  finalPrice: number;
  // finalPrice qaysi valyutada kiritilgani ($ yoki so'm)
  currency?: Currency;
  /**
   * Sotuvni kim amalga oshirgani. Faqat OWNER boshqa xodimni tanlay oladi
   * (masalan, o'zi kirib turib sotuvchi nomidan yozish uchun); SELLER doim
   * o'zi nomidan sotadi — bu maydon e'tiborga olinmaydi.
   */
  sellerId?: string;
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
  if (phone.deletedAt) throw new Error("Bu telefon o'chirilgan");
  if (phone.branchId !== input.branchId) {
    throw new Error("Telefon boshqa filialga tegishli");
  }
  if (phone.status === "SOLD") {
    throw new Error("Bu telefon allaqachon sotilgan");
  }

  // Sotuvchini aniqlash: OWNER boshqa xodimni tanlay oladi, SELLER — faqat o'zi
  let sellerId = user.id;
  if (user.role === "OWNER" && input.sellerId && input.sellerId !== user.id) {
    const chosen = await prisma.user.findUnique({ where: { id: input.sellerId } });
    if (!chosen || chosen.deletedAt) {
      throw new Error("Tanlangan sotuvchi topilmadi yoki bloklangan");
    }
    if (chosen.role === "SELLER" && chosen.branchId !== input.branchId) {
      throw new Error("Tanlangan sotuvchi bu filialga tegishli emas");
    }
    sellerId = chosen.id;
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
        sellerId,
        branchId: input.branchId,
        finalPrice: input.finalPrice,
        currency: input.currency ?? "UZS",
        paymentType: input.paymentType,
      },
    });

    // Telegram bildirishnomasi uchun kerakli ko'rsatma ma'lumotlar
    // (branch/seller nomi) — transaction ICHIDA, chunki shu yerda
    // freshPhone allaqachon yuklangan, qo'shimcha so'rov arzon.
    const [branchInfo, sellerInfo] = await Promise.all([
      tx.branch.findUnique({ where: { id: input.branchId }, select: { name: true } }),
      tx.user.findUnique({ where: { id: sellerId }, select: { name: true } }),
    ]);

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
          // Qarz sotuv valyutasida yuritiladi
          currency: input.currency ?? "UZS",
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
          sellerId,
        },
      },
    });

    return {
      sale,
      customer,
      notifyInfo: {
        branchName: branchInfo?.name ?? "Noma'lum filial",
        sellerName: sellerInfo?.name ?? "Noma'lum sotuvchi",
        phoneModel: `${phone.brand} ${phone.model}`,
      },
    };
  });

  // Telegram bildirishnomasi tranzaksiya TASHQARISIDA yuboriladi — tashqi
  // tarmoq so'rovi (Telegram API) hech qachon baza tranzaksiyasini
  // ushlab turmasligi kerak. Xatolik bo'lsa, sotuv baribir muvaffaqiyatli
  // yakunlangan bo'ladi (notifyCreditSale ichida ham himoyalangan).
  if (result.customer) {
    void notifyCreditSale({
      customerName: result.customer.fullName,
      customerPhone: result.customer.phoneNumber,
      phoneModel: result.notifyInfo.phoneModel,
      totalAmount: Number(result.customer.totalAmount),
      initialPayment: Number(result.customer.paidAmount),
      currency: result.customer.currency,
      dueDate: result.customer.dueDate,
      branchName: result.notifyInfo.branchName,
      sellerName: result.notifyInfo.sellerName,
    }).catch((error: unknown) =>
      console.error("[sales] Kredit sotuv bildirishnomasi xatosi:", error)
    );
  }

  // Har 5 sotuvda do'kon kanaliga avtomatik "sotildi" posti (5.2) —
  // tranzaksiya tashqarisida, xato bo'lsa sotuvga ta'sir qilmaydi.
  void maybePostSoldBatch();

  return { sale: result.sale, customer: result.customer };
}

/**
 * Bitta sotuvni chek (PDF) yaratish uchun to'liq ma'lumotlar bilan
 * qaytaradi. lib/receipt-pdf.ts shu funksiyaning natijasini ishlatadi.
 */
export async function getSaleForReceipt(user: SessionUser, saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      phone: { select: { model: true, brand: true, imei: true, color: true, storageGB: true } },
      seller: { select: { name: true } },
      branch: { select: { name: true, address: true, phoneNumber: true } },
      customer: true,
    },
  });
  if (!sale) throw new Error("Sotuv topilmadi");

  assertBranchAccess(user, sale.branchId);

  return sale;
}
export async function listSales(user: SessionUser, branchId: string) {
  assertBranchAccess(user, branchId);

  return prisma.sale.findMany({
    where: { branchId },
    orderBy: { saleDate: "desc" },
    include: {
      phone: { select: { model: true, brand: true, imei: true } },
      seller: { select: { id: true, name: true } },
      customer: { select: { fullName: true, status: true } },
    },
  });
}

/**
 * Sotuvni QAYTARISH (bekor qilish):
 *  - telefon omborga qaytadi (status IN_STOCK, arxivdan chiqadi);
 *  - sotuv yozuvi O'CHIRILMAYDI — returnedAt bilan belgilanadi (tarix
 *    va audit uchun), lekin barcha hisobotlardan chiqariladi;
 *  - kredit sotuv bo'lsa, mijoz qarzi CANCELLED holatiga o'tadi
 *    (to'lov tarixi saqlanadi — pul qaytarish do'kon ichida hal qilinadi).
 */
export async function returnSale(
  user: SessionUser,
  saleId: string,
  reason?: string
) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      phone: { select: { id: true, brand: true, model: true, imei: true } },
      customer: { select: { id: true, status: true } },
    },
  });
  if (!sale) throw new Error("Sotuv topilmadi");

  assertBranchAccess(user, sale.branchId);

  if (sale.returnedAt) {
    throw new Error("Bu sotuv allaqachon qaytarilgan");
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const returned = await tx.sale.update({
      where: { id: saleId },
      data: { returnedAt: new Date(), returnReason: reason?.trim() || null },
    });

    // Telefon omborga qaytadi — yana sotish mumkin bo'ladi
    await tx.phone.update({
      where: { id: sale.phone.id },
      data: { status: "IN_STOCK", archivedAt: null },
    });

    // Kredit qarzi bekor qilinadi (to'lov tarixi o'chirilmaydi)
    if (sale.customer && sale.customer.status !== "CANCELLED") {
      await tx.customer.update({
        where: { id: sale.customer.id },
        data: { status: "CANCELLED" },
      });
    }

    await tx.auditLog.create({
      data: {
        action: "SALE_RETURNED",
        userId: user.id,
        branchId: sale.branchId,
        details: {
          saleId,
          phoneId: sale.phone.id,
          imei: sale.phone.imei,
          model: `${sale.phone.brand} ${sale.phone.model}`,
          reason: reason?.trim() || null,
        },
      },
    });

    return returned;
  });

  // Qaytarish muhim moliyaviy amal — admin darhol xabardor bo'ladi
  void notifySecurityEvent("Sotuv qaytarildi", [
    `Model: ${sale.phone.brand} ${sale.phone.model}`,
    `IMEI: ${sale.phone.imei}`,
    ...(reason?.trim() ? [`Sabab: ${reason.trim()}`] : []),
  ]).catch((error: unknown) =>
    console.error("[sales] Qaytarish bildirishnomasi xatosi:", error)
  );

  return updated;
}

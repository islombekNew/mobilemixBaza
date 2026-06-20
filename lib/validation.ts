import { z } from "zod";

/**
 * Barcha API route'lar uchun markazlashtirilgan kiruvchi ma'lumot
 * validatsiyasi. Avval `zod` paket.json'da bor edi, lekin hech qayerda
 * ishlatilmagan edi — shu sabab NaN, bo'sh, manfiy yoki noto'g'ri formatdagi
 * qiymatlar to'g'ridan-to'g'ri Prisma'ga yetib borardi.
 */

// IMEI — 15 xonali raqam (standart IMEI uzunligi)
const imeiSchema = z
  .string()
  .trim()
  .regex(/^\d{15}$/, "IMEI 15 xonali raqamdan iborat bo'lishi kerak");

const positiveNumber = z.coerce
  .number({ invalid_type_error: "Raqam kiritilishi kerak" })
  .finite("Raqam kiritilishi kerak")
  .positive("Musbat son bo'lishi kerak");

const nonNegativeNumber = z.coerce
  .number({ invalid_type_error: "Raqam kiritilishi kerak" })
  .finite("Raqam kiritilishi kerak")
  .min(0, "Manfiy son bo'lishi mumkin emas");

const warrantyMonthsSchema = z.coerce
  .number()
  .int()
  .min(0, "Kafolat muddati manfiy bo'lishi mumkin emas")
  .default(0);

export const phoneCreateSchema = z.object({
  model: z.string().trim().min(1, "Model kiritilishi shart"),
  brand: z.string().trim().min(1, "Brend kiritilishi shart"),
  color: z.string().trim().min(1, "Rang kiritilishi shart"),
  storageGB: z.coerce.number().int().positive("Xotira hajmi musbat son bo'lishi kerak"),
  imei: imeiSchema,
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  costPrice: nonNegativeNumber,
  salePrice: positiveNumber,
  branchId: z.string().min(1),
  ramGB: z.coerce.number().int().positive().optional().nullable(),
  batteryHealth: z.coerce.number().int().min(1).max(100).optional().nullable(),
  hasBox: z.coerce.boolean().default(false),
  hasCharger: z.coerce.boolean().default(false),
  hasDocuments: z.coerce.boolean().default(false),
  warrantyMonths: warrantyMonthsSchema,
  supplier: z.string().trim().max(200).optional().nullable(),
});

export const phoneUpdateSchema = z.object({
  model: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  storageGB: z.coerce.number().int().positive().optional(),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).optional(),
  costPrice: nonNegativeNumber.optional(),
  salePrice: positiveNumber.optional(),
  ramGB: z.coerce.number().int().positive().optional().nullable(),
  batteryHealth: z.coerce.number().int().min(1).max(100).optional().nullable(),
  hasBox: z.coerce.boolean().optional(),
  hasCharger: z.coerce.boolean().optional(),
  hasDocuments: z.coerce.boolean().optional(),
  warrantyMonths: warrantyMonthsSchema.optional(),
  supplier: z.string().trim().max(200).optional().nullable(),
});

export const saleCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Ism-familiya kiritilishi shart"),
  phoneNumber: z.string().trim().min(5, "Telefon raqami kiritilishi shart"),
  totalAmount: positiveNumber,
  paidAmount: nonNegativeNumber.default(0),
  dueDate: z.coerce.date({ invalid_type_error: "Muddat sanasi noto'g'ri" }),
  paymentPlan: z.enum(["ONE_TIME", "MONTHLY"]),
});

export const saleCreateSchema = z
  .object({
    phoneId: z.string().min(1),
    branchId: z.string().min(1),
    paymentType: z.enum(["CASH", "CARD", "CREDIT"]),
    finalPrice: positiveNumber,
    customer: saleCustomerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === "CREDIT" && !data.customer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kredit sotuv uchun mijoz ma'lumotlari kerak",
        path: ["customer"],
      });
      return;
    }
    if (data.customer && data.customer.paidAmount > data.customer.totalAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boshlang'ich to'lov umumiy summadan ko'p bo'lishi mumkin emas",
        path: ["customer", "paidAmount"],
      });
    }
  });

export const debtPaymentCreateSchema = z.object({
  amount: positiveNumber,
  paymentType: z.enum(["CASH", "CARD"]).default("CASH"),
  note: z.string().trim().max(500).optional(),
});

export const branchCreateSchema = z.object({
  name: z.string().trim().min(1, "Nomi kiritilishi shart"),
  address: z.string().trim().min(1, "Manzil kiritilishi shart"),
  phoneNumber: z.string().trim().min(5, "Telefon raqami kiritilishi shart"),
});

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Ism-familiya kiritilishi shart"),
    login: z
      .string()
      .trim()
      .min(3, "Login kamida 3 belgidan iborat bo'lishi kerak")
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Login faqat harf, raqam, '_', '.', '-' belgilaridan iborat bo'lishi kerak"
      ),
    password: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
    role: z.enum(["OWNER", "SELLER"]),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "SELLER" && !data.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sotuvchi uchun filial tanlanishi shart",
        path: ["branchId"],
      });
    }
  });

export const phoneTransferSchema = z.object({
  targetBranchId: z.string().min(1, "Maqsad filial tanlanishi shart"),
});

/**
 * Excel/CSV orqali ulgurji import qilinadigan har bir qator uchun
 * validatsiya. `phoneCreateSchema`dan farqi — `branchId` bu yerda yo'q
 * (butun fayl bitta filial uchun yuklanadi, route'da qo'shiladi) va
 * IMEI noyobligini DB darajasida tekshiramiz (bu yerda faqat format).
 */
export const phoneImportRowSchema = z.object({
  model: z.string().trim().min(1, "Model kiritilishi shart"),
  brand: z.string().trim().min(1, "Brend kiritilishi shart"),
  color: z.string().trim().min(1, "Rang kiritilishi shart"),
  storageGB: z.coerce.number().int().positive("Xotira hajmi musbat son bo'lishi kerak"),
  imei: imeiSchema,
  condition: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(["NEW", "USED", "REFURBISHED"])),
  costPrice: nonNegativeNumber,
  salePrice: positiveNumber,
});

export type PhoneImportRow = z.infer<typeof phoneImportRowSchema>;

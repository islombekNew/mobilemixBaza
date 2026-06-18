import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Bu skript ikki vazifani bajaradi:
 *  1) Birinchi OWNER hisobini yaratadi (yoki paroli unutilgan bo'lsa, ALMASHTIRADI).
 *  2) Agar SEED_WITH_DEMO_DATA=true bo'lsa, sinov uchun namuna filial/sotuvchi/
 *     telefon qo'shadi (PRODUCTION bazasida buni YOQMASLIK tavsiya etiladi).
 *
 * Production'da (Railway) ishlatish:
 *   SEED_OWNER_LOGIN, SEED_OWNER_PASSWORD, SEED_OWNER_NAME muhit
 *   o'zgaruvchilarini o'zingiz tanlagan qiymatlarga o'rnating, so'ng:
 *     npm run prisma:seed
 *
 * Parolni keyinchalik unutib qo'ysangiz: SEED_OWNER_PASSWORD'ni yangi
 * qiymatga o'zgartirib, shu skriptni qayta ishga tushiring — parol
 * yangilanadi (chunki bu yerda "update" ham qiladi, faqat "create" emas).
 */
const OWNER_NAME = process.env.SEED_OWNER_NAME ?? "Do'kon egasi";
const OWNER_LOGIN = process.env.SEED_OWNER_LOGIN ?? "owner";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "owner123";
const WITH_DEMO_DATA = process.env.SEED_WITH_DEMO_DATA === "true";

async function main() {
  console.log("🌱 Owner hisobi tayyorlanmoqda...");

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { login: OWNER_LOGIN },
    update: { passwordHash, name: OWNER_NAME, role: "OWNER", branchId: null },
    create: {
      name: OWNER_NAME,
      login: OWNER_LOGIN,
      passwordHash,
      role: "OWNER",
      branchId: null,
    },
  });

  console.log(`✅ Owner tayyor: login="${OWNER_LOGIN}" (${owner.name})`);

  if (!process.env.SEED_OWNER_PASSWORD) {
    console.log("");
    console.log('⚠️  DIQQAT: standart parol ishlatildi ("owner123").');
    console.log("    PRODUCTION'da buni albatta almashtiring:");
    console.log(
      "    Railway/Vercel'da SEED_OWNER_PASSWORD muhit o'zgaruvchisini"
    );
    console.log(
      '    kuchli parolga o\'rnating va "npm run prisma:seed" ni qayta ishga tushiring.'
    );
    console.log("");
  }

  if (WITH_DEMO_DATA) {
    console.log(
      "🌱 SEED_WITH_DEMO_DATA=true — namuna (demo) ma'lumotlar qo'shilmoqda..."
    );

    const branch1 = await prisma.branch.upsert({
      where: { id: "branch-1" },
      update: {},
      create: {
        id: "branch-1",
        name: "Mix Mobile — Markaziy filial",
        address: "Namangan sh., Atabekov ko'chasi 12",
        phoneNumber: "+998901234567",
      },
    });

    const sellerPasswordHash = await bcrypt.hash("seller123", 10);
    const seller = await prisma.user.upsert({
      where: { login: "seller1" },
      update: {},
      create: {
        name: "Dilshod Yusupov",
        login: "seller1",
        passwordHash: sellerPasswordHash,
        role: "SELLER",
        branchId: branch1.id,
      },
    });

    await prisma.phone.upsert({
      where: { imei: "356789012345671" },
      update: {},
      create: {
        model: "iPhone 13",
        brand: "Apple",
        color: "Ko'k",
        storageGB: 128,
        imei: "356789012345671",
        condition: "NEW",
        costPrice: 5800000,
        salePrice: 6500000,
        status: "IN_STOCK",
        branchId: branch1.id,
        addedById: seller.id,
      },
    });

    console.log(`   Demo sotuvchi: login="seller1", parol="seller123"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

    const SELLER_LOGIN = process.env.SEED_SELLER_LOGIN ?? "seller1";
    const SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD ?? "seller123";

    const sellerPasswordHash = await bcrypt.hash(SELLER_PASSWORD, 10);
    const seller = await prisma.user.upsert({
      where: { login: SELLER_LOGIN },
      update: { passwordHash: sellerPasswordHash, branchId: branch1.id },
      create: {
        name: "Dilshod Yusupov",
        login: SELLER_LOGIN,
        passwordHash: sellerPasswordHash,
        role: "SELLER",
        branchId: branch1.id,
      },
    });


    console.log(`   Demo sotuvchi: login="${SELLER_LOGIN}", parol="${SELLER_PASSWORD}"`);
  }

  // --------------------------------------------------------------------
  // ASOSIY FILIALLAR: Namangan va Toshkent.
  // Demo flagiga bog'liq emas — bular haqiqiy, doimiy filiallar.
  // Har filial uchun ALOHIDA sotuvchi yaratiladi (branchId orqali bog'lanadi),
  // shu sababli har bir sotuvchi login/parol bilan kirganda faqat o'z
  // filialining ma'lumotlarini ko'radi (lib/access-control.ts: assertBranchAccess).
  // Skript qayta ishga tushirilsa ham xavfsiz (upsert) — duplikat yaratmaydi,
  // faqat parolni env'dagi qiymatga moslab yangilaydi.
  // --------------------------------------------------------------------
  console.log("");
  console.log("🌱 Asosiy filiallar tayyorlanmoqda: Andijon, Toshkent...");

  interface BranchSeed {
    id: string;
    name: string;
    address: string;
    phoneNumber: string;
    sellerLoginEnv: string;
    sellerPasswordEnv: string;
    sellerName: string;
  }

  const REAL_BRANCHES: BranchSeed[] = [
    {
      // ID tarixiy sabablarga ko'ra "branch-namangan" bo'lib qoladi (jonli
      // bazada shu ID ostida Andijon filiali ma'lumotlari bor), lekin nomi
      // Andijon — asosiy filial.
      id: "branch-namangan",
      name: "Mix Mobile — Andijon",
      address: process.env.ANDIJON_ADDRESS ?? "Andijon shahri",
      phoneNumber: process.env.ANDIJON_PHONE ?? "+998900000001",
      sellerLoginEnv: "ANDIJON_SELLER_LOGIN",
      sellerPasswordEnv: "ANDIJON_SELLER_PASSWORD",
      sellerName: process.env.ANDIJON_SELLER_NAME ?? "Andijon sotuvchisi",
    },
    {
      id: "branch-toshkent",
      name: "Mix Mobile — Toshkent",
      address: process.env.TOSHKENT_ADDRESS ?? "Toshkent shahri",
      phoneNumber: process.env.TOSHKENT_PHONE ?? "+998900000002",
      sellerLoginEnv: "TOSHKENT_SELLER_LOGIN",
      sellerPasswordEnv: "TOSHKENT_SELLER_PASSWORD",
      sellerName: process.env.TOSHKENT_SELLER_NAME ?? "Toshkent sotuvchisi",
    },
  ];

  for (const def of REAL_BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { id: def.id },
      update: { name: def.name, address: def.address, phoneNumber: def.phoneNumber },
      create: {
        id: def.id,
        name: def.name,
        address: def.address,
        phoneNumber: def.phoneNumber,
      },
    });

    const login = process.env[def.sellerLoginEnv];
    const password = process.env[def.sellerPasswordEnv];

    if (!login || !password) {
      console.log(
        `   ⚠️  ${def.name}: ${def.sellerLoginEnv}/${def.sellerPasswordEnv} .env'da topilmadi — sotuvchi hisobi yaratilmadi.`
      );
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { login },
      update: { passwordHash, name: def.sellerName, role: "SELLER", branchId: branch.id },
      create: {
        name: def.sellerName,
        login,
        passwordHash,
        role: "SELLER",
        branchId: branch.id,
      },
    });

    console.log(`   ✅ ${def.name}: sotuvchi login="${login}" tayyor (parol .env'dagidek)`);
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
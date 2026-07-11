-- Valyuta qo'llab-quvvatlash: $ va so'm
-- Barcha o'zgarishlar QO'SHIMCHA (additive) — mavjud ma'lumot yo'qolmaydi,
-- eski yozuvlar avtomatik UZS deb belgilanadi.

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('UZS', 'USD');

-- AlterTable: phones (tan narx + sotuv narxi valyutasi)
ALTER TABLE "phones" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'UZS';

-- AlterTable: sales (yakuniy sotuv narxi valyutasi)
ALTER TABLE "sales" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'UZS';

-- AlterTable: customers (qarz valyutasi — sotuvdan ko'chiriladi)
ALTER TABLE "customers" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'UZS';

-- CreateTable: exchange_rates (kunlik USD/UZS kursi keshi)
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "usdToUzs" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_date_key" ON "exchange_rates"("date");

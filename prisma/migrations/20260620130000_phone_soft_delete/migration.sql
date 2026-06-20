-- DropIndex
-- IMEI endi to'liq unikal emas — soft-delete qilingan (deletedAt to'ldirilgan)
-- telefonlar bilan bir xil IMEI'ni qayta ishlatish mumkin bo'lishi uchun.
DROP INDEX "phones_imei_key";

-- AlterTable
ALTER TABLE "phones" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
-- Oddiy (filtrlashsiz) qidiruv tezligini saqlab qolish uchun.
CREATE INDEX "phones_imei_idx" ON "phones"("imei");
CREATE INDEX "phones_deletedAt_idx" ON "phones"("deletedAt");

-- CreateIndex
-- MUHIM: bu PARTIAL unique index — faqat "deletedAt IS NULL" (hali
-- o'chirilmagan) qatorlar orasida IMEI noyobligini ta'minlaydi. Prisma
-- schema'sida bunday shartli unique'ni yozib bo'lmaydi, shu sababli bu
-- yerda qo'lda yozilgan. Ilova darajasida ham tekshiruv bor
-- (lib/phones.ts: createPhone, bulkImportPhones) — bu esa oxirgi,
-- buzilmas himoya qatlami (race condition'larga qarshi).
CREATE UNIQUE INDEX "phones_imei_active_key" ON "phones"("imei") WHERE "deletedAt" IS NULL;

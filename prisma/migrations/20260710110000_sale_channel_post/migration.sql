-- Telegram kanal posti kuzatuvi: har 5 sotuvda kanalga avtomatik
-- "sotildi" posti chiqadi, post qilingan sotuvlar belgilanadi.

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "postedToChannel" BOOLEAN NOT NULL DEFAULT false;

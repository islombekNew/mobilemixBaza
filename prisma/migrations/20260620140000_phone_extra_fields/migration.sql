-- AlterTable: telefon uchun qo'shimcha maydonlar
ALTER TABLE "phones"
  ADD COLUMN "ramGB"          INTEGER,
  ADD COLUMN "batteryHealth"  INTEGER,
  ADD COLUMN "hasBox"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasCharger"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasDocuments"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "supplier"       TEXT;

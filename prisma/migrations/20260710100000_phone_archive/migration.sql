-- Oylik arxiv: o'tgan oylarda sotilgan telefonlar ombor ko'rinishidan
-- yashiriladi (archivedAt to'ldiriladi), lekin bazadan O'CHIRILMAYDI.

-- AlterTable
ALTER TABLE "phones" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "phones_archivedAt_idx" ON "phones"("archivedAt");

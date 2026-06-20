-- AlterEnum
-- Postgres'da enum'ga yangi qiymat qo'shish (mavjud qatorlarga ta'sir qilmaydi)
ALTER TYPE "AuditAction" ADD VALUE 'PHONE_TRANSFERRED';
ALTER TYPE "AuditAction" ADD VALUE 'PHONE_IMPORTED';

-- AlterTable
ALTER TABLE "phones" ADD COLUMN "photoUrl" TEXT;

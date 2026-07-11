-- Xodim bloklash (soft-delete), sotuvni qaytarish, filial arxivlash.
-- Barcha o'zgarishlar QO'SHIMCHA — mavjud ma'lumot yo'qolmaydi.

-- AlterEnum: CustomerStatus'ga CANCELLED (qaytarilgan sotuv qarzi bekor)
ALTER TYPE "CustomerStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterEnum: AuditAction yangi amallar
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SALE_RETURNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANCH_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BRANCH_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_BLOCKED';

-- AlterTable: users — bloklash (tarix saqlanadi, yozuv o'chirilmaydi)
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- AlterTable: sales — qaytarilgan sotuv belgilari
ALTER TABLE "sales" ADD COLUMN "returnedAt" TIMESTAMP(3);
ALTER TABLE "sales" ADD COLUMN "returnReason" TEXT;
CREATE INDEX "sales_returnedAt_idx" ON "sales"("returnedAt");

-- AlterTable: branches — arxivlash (ichida ma'lumot bor filial o'chirilmaydi)
ALTER TABLE "branches" ADD COLUMN "archivedAt" TIMESTAMP(3);

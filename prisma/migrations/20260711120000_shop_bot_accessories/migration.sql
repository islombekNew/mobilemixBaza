-- Mijozlar uchun do'kon boti: aksesuarlar, telefon Telegram media,
-- bot chat holati, topilmagan qidiruvlar jurnali.
-- Barcha o'zgarishlar QO'SHIMCHA — mavjud ma'lumot yo'qolmaydi.

-- AlterTable: phones — Telegram media file_id'lari
ALTER TABLE "phones" ADD COLUMN "tgPhotoFileId" TEXT;
ALTER TABLE "phones" ADD COLUMN "tgVideoFileId" TEXT;

-- CreateTable: accessories
CREATE TABLE "accessories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "forModel" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "tgPhotoFileId" TEXT,
    "tgVideoFileId" TEXT,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accessories_deletedAt_idx" ON "accessories"("deletedAt");

-- CreateTable: bot_chat_states
CREATE TABLE "bot_chat_states" (
    "chatId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_chat_states_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable: search_misses
CREATE TABLE "search_misses" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_misses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_misses_createdAt_idx" ON "search_misses"("createdAt");

-- Bot orqali boshqariladigan adminlar ro'yxati (ega env'da qoladi,
-- qo'shimcha adminlar shu jadvalda). Faqat QO'SHIMCHA o'zgarish.

CREATE TABLE "telegram_admins" (
    "chatId" TEXT NOT NULL,
    "name" TEXT,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_admins_pkey" PRIMARY KEY ("chatId")
);

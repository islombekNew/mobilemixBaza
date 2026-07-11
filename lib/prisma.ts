import { PrismaClient } from "@prisma/client";

// Next.js dev rejimida hot-reload paytida ko'plab PrismaClient
// nusxalari yaratilishining oldini olish uchun global cache ishlatamiz.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Har bir SQL so'rovni konsolga yozish (query log) dev'da sezilarli
// sekinlashuvга sabab bo'ladi. Shu sababli u faqat PRISMA_QUERY_LOG=1
// bo'lganda yoqiladi — odatda faqat "error"/"warn" ko'rsatiladi.
const logLevels =
  process.env.PRISMA_QUERY_LOG === "1"
    ? (["query", "error", "warn"] as const)
    : (["error", "warn"] as const);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [...logLevels],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

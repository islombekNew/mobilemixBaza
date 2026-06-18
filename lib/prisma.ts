import { PrismaClient } from "@prisma/client";

// Next.js dev rejimida hot-reload paytida ko'plab PrismaClient
// nusxalari yaratilishining oldini olish uchun global cache ishlatamiz.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

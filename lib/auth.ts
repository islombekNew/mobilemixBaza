import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

/**
 * To'liq NextAuth konfiguratsiyasi — bcryptjs va Prisma'dan foydalanadi,
 * shuning uchun faqat Node.js muhitida (API route'lar, server
 * komponentlar) ishlatilishi kerak, middleware.ts'da EMAS.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Parol", type: "password" },
      },
      async authorize(credentials) {
        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!login || !password) return null;

        const user = await prisma.user.findUnique({
          where: { login },
        });

        if (!user) return null;

        // Bloklangan (deletedAt to'ldirilgan) xodim tizimga kira olmaydi
        if (user.deletedAt) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
});

import type { NextAuthConfig } from "next-auth";

/**
 * Edge Runtime'da (middleware.ts) ishlatiladigan "yengil" konfiguratsiya —
 * providers (Credentials + bcryptjs) shu yerda YO'Q, chunki bcryptjs
 * Node.js'ga xos API'lardan (process.nextTick, setImmediate) foydalanadi
 * va Edge Runtime'da ishlamaydi.
 *
 * To'liq konfiguratsiya (providers bilan) — lib/auth.ts'da, faqat
 * Node.js muhitida ishlaydigan API route'lar va server komponentlarda
 * ishlatiladi.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.branchId = user.branchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "OWNER" | "SELLER";
        session.user.branchId = token.branchId as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

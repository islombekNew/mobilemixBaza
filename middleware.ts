import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// E'TIBOR: bu yerda lib/auth.ts (Credentials provider + bcryptjs) emas,
// Edge Runtime'ga mos "yengil" authConfig ishlatiladi.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicPath =
    PUBLIC_PATHS.includes(nextUrl.pathname) || nextUrl.pathname === "/";

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Statik fayllar va Next.js ichki yo'llardan tashqari hammasi tekshiriladi
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

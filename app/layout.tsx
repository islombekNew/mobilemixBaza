import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { LanguageProvider } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "Montrax — Ombor va Sotuv Boshqarish Tizimi",
  description: "Istaganingiz shu yerda",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    // suppressHydrationWarning: ba'zi brauzer kengaytmalari (masalan
    // LanguageTool — `data-lt-installed`, Grammarly va h.k.) React yuklanishidan
    // OLDIN <html>/<body> tegiga atribut qo'shadi. Bu server va client HTML'ini
    // farqlantiradi va konsolda hydration ogohlantirishi chiqadi. Bu bizning
    // kodimiz xatosi emas, shu sababli ogohlantirish shu tegda bostiriladi.
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mix Mobile — Ombor va Sotuv Boshqarish Tizimi",
  description: "Istaganingiz shu yerda",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: ba'zi brauzer kengaytmalari (masalan
    // LanguageTool — `data-lt-installed`, Grammarly va h.k.) React yuklanishidan
    // OLDIN <html>/<body> tegiga atribut qo'shadi. Bu server va client HTML'ini
    // farqlantiradi va konsolda hydration ogohlantirishi chiqadi. Bu bizning
    // kodimiz xatosi emas, shu sababli ogohlantirish shu tegda bostiriladi.
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

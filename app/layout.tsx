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
    <html lang="uz">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ES Adviser",
  description: "ESが設問に回答できているかを診断するAIサービス"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

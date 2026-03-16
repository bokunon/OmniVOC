import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniVOC",
  description: "ユーザーの声を収集・集約・チケット化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

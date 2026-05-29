import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChoreQuest",
  description: "A point-based bidding dashboard for household chores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

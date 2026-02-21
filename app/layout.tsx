import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UC Davis Pantry",
  description: "Free on-campus grocery store for UC Davis students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

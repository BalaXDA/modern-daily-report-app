import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Daily Report Portal",
  description: "Internal portal for daily QA test reports",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}

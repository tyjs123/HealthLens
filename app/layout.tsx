import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ReportProvider } from "@/context/report-context";
import { Toaster } from "@/components/ui/sonner";
import { Disclaimer } from "@/components/disclaimer";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HealthLens - 体检报告 AI 解读官",
  description: "3 分钟读懂你的体检报告",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ReportProvider>
          <main className="flex-1">{children}</main>
          <Disclaimer />
          <Toaster position="top-center" />
        </ReportProvider>
      </body>
    </html>
  );
}

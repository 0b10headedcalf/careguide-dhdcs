import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { CaseProvider } from "@/lib/coverage/case-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

export const metadata: Metadata = {
  title: "CareGuide | Healthcare Benefits Navigation",
  description:
    "CareGuide helps people understand healthcare benefits, complete forms, and connect with local support."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sourceSerif.variable}`}>
        <CaseProvider>{children}</CaseProvider>
      </body>
    </html>
  );
}

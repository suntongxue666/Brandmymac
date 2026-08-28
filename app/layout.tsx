import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const macImageUrl =
  "https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/brandmymac_2560w-2.png";
const faviconUrl =
  "https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/laptop_app_icon_144.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrandMyMac",
  description:
    "Reserve fixed daily placements inside a Mac screen marketplace for product discovery.",
  openGraph: {
    title: "BrandMyMac",
    description:
      "Reserve screen regions for your product icon, link, and campaign schedule.",
    images: [macImageUrl],
  },
  icons: {
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: faviconUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

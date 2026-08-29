import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const macImageUrl =
  "https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/brandmymac_2560w-2.png";
const faviconUrl =
  "https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/laptop_app_icon_144.png";
const siteUrl = "https://brandmymac.xyz";
const siteTitle = "BrandMyMac | Mac Screen Ads for Founder Tools";
const siteDescription =
  "Reserve fixed-price Mac screen placements for your product. Daily reviewed slots on a live desktop layout for builders, founders, and indie tools.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "BrandMyMac",
  keywords: [
    "Mac screen ads",
    "fixed price ads",
    "founder tools",
    "indie hacker marketing",
    "product discovery",
    "daily ad placement",
    "startup advertising",
    "builder audience",
    "SaaS promotion",
    "developer tools marketing",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "BrandMyMac",
    type: "website",
    images: [
      {
        url: macImageUrl,
        width: 2560,
        height: 1440,
        alt: "Mac screen with reservable product ad placements",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [macImageUrl],
  },
  icons: {
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: faviconUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-M0KLSDHYDG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-M0KLSDHYDG');
          `}
        </Script>
      </body>
    </html>
  );
}

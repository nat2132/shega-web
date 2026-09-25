import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://shega.com"),
  title: {
    default: "Shega - Business Management Platform for Ethiopian Businesses",
    template: "%s | Shega",
  },
  description: "The all-in-one inventory, sales, and business management platform built for Ethiopian wholesalers, retailers, and distributors.",
  keywords: ["inventory management", "POS", "Ethiopia", "business software", "ERP", "warehouse management"],
  icons: {
    icon: "/images/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Shega",
    title: "Shega - Business Management Platform for Ethiopian Businesses",
    description: "Inventory, sales, and business management for Ethiopian wholesalers, retailers, and distributors.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://shega.com",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "Shega" }],
  },
  twitter: {
    card: "summary",
    title: "Shega - Business Management Platform",
    description: "Inventory, sales, and business management for Ethiopian businesses.",
    images: ["/images/logo.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, interTight.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

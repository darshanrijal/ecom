import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import Providers from "./providers";
import { CreateCart } from "@/components/create-cart";
import TopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gada Electronics — Phones, Appliances & Home Entertainment",
    template: "%s | Gada Electronics",
  },
  description:
    "Shop mobile phones, TVs, refrigerators, washing machines, ACs, laptops and more at Gada Electronics. Genuine products, official warranty, 0% EMI and the best after-sales service in Nepal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <TopLoader
          color="oklch(75% 0.183 55.934)"
          height={2.4}
          showSpinner={false}
        />
        <Providers>
          {children}

          <CreateCart />
        </Providers>
      </body>
    </html>
  );
}

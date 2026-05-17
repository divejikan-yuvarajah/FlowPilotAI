import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-display",
  weight: "100 900",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://flow-pilot-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(PROD_URL),
  title: "FlowPilot AI · Financial OS for Sri Lankan SMEs",
  description:
    "Predict cash crises 22 days early. Recover payments automatically. Built on Seylan Bank APIs.",
  openGraph: {
    title: "FlowPilot AI",
    description:
      "Predict cash crises 22 days early. Recover payments automatically. Built on Seylan Bank APIs.",
    url: "https://flowpilot.ai",
    siteName: "FlowPilot AI",
    images: [{ url: "/og", width: 1200, height: 630, alt: "FlowPilot AI" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowPilot AI · Financial OS for Sri Lankan SMEs",
    description: "Predict cash crises 22 days early. Built on Seylan Bank APIs.",
    images: ["/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* 🚀 Pre-warm DNS + TLS for Supabase so the first auth/data request
            doesn't pay the connection cost — saves 100-300ms on initial nav. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link
              rel="preconnect"
              href={process.env.NEXT_PUBLIC_SUPABASE_URL}
              crossOrigin="anonymous"
            />
          </>
        )}
        {/* Google Fonts (Sinhala + Tamil) loaded async-style with preconnect first */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;500;600&family=Noto+Sans+Tamil:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${geistSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

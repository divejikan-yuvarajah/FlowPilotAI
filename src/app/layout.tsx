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

export const metadata: Metadata = {
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
      {/* Noto Sans for Sinhala + Tamil glyph support in recovery messages */}
      <head>
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

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Polyfill from "./Polyfill";
import Navbar from "../components/layout/Navbar";
import Providers from "./Providers";
import MaggieCursor from "../components/MaggieCursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaurusSwap",
  description: "Algorand-native trading UI built with TaurusSwap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex min-h-screen flex-col bg-background text-foreground" suppressHydrationWarning>
        <Polyfill />
        <Providers>
          <MaggieCursor />
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}

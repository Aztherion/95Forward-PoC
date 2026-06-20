import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "../styles/globals.css";

const hanken = localFont({
  src: "./fonts/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-hanken",
  display: "swap",
  adjustFontFallback: false,
});

const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-wght-normal.woff2", style: "normal" },
    { path: "./fonts/newsreader-latin-wght-italic.woff2", style: "italic" },
  ],
  weight: "200 800",
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: false,
});

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Keystone CRM · 95 Forward",
  description: "Keystone CRM with the 95 Forward major-gifts workspace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={[hanken.variable, newsreader.variable, plexMono.variable].join(" ")}>
      <body>{children}</body>
    </html>
  );
}

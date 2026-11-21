import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";


// Bundled instead of next/font/google so builds don't download from Google Fonts,
// which made CI fail intermittently. One variable file covers weights 400-800 (latin).
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-Latin.woff2",
  weight: "400 800",
  variable: "--font-bricolage",
  display: "swap",
})

// the landing page's body text
const instrument = localFont({
  src: "./fonts/InstrumentSans-Latin.woff2",
  weight: "400 700",
  variable: "--font-instrument",
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "tezera", template: "%s | Tezera" },
  description: "Every event in Sri Lanka, in one place.",
  icons: "./images/marketing/meta/tezera-tab.svg"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}

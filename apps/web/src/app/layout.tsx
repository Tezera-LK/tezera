import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";


const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "tezera", template: "%s | Tezera" },
  description: "Every event in Sri Lanka, in one place.",
  icons: "./images/marketing/meta/tezera-tab.svg"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}

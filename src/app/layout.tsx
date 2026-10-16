import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Mise & Bilan · Casino et paris sportifs",
  description: "Suivi personnel des gains et pertes au casino et aux paris sportifs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">
        <div className="decor" aria-hidden="true"><div className="roulette" /></div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}

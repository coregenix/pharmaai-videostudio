import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = { title: "PharmaAI-VideoStudio", description: "Turn a pharmacology topic into a reviewed, narrated educational video." };
export const viewport: Viewport = { themeColor: "#06101e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}

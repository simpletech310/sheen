import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sheen — Make it look sharp.",
  description:
    "On-demand wash & detail. Vetted local pros. Book in 60 seconds, professionally cleaned, payment handled. Get it sheened.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sheen — Make it look sharp.",
    description: "On-demand wash & detail. Vetted local pros.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#FAFAF7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-bone text-ink font-sans antialiased [font-feature-settings:'tnum'] min-h-screen">
        {children}
      </body>
    </html>
  );
}

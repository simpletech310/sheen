import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

// Display: Anton — condensed athletic sans, the family of choice for sports
// wordmarks. Single weight, all-caps friendly. No italic, no curls.
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Body: Inter — neutral, plenty of weights, great with tabular numerals.
const body = Inter({
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
  themeColor: "#003594",
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

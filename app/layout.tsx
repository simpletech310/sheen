import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider, ToastBridge } from "@/components/ui/Toast";

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
  title: {
    default: "Sheen — Make it look sharp.",
    template: "%s · Sheen",
  },
  description:
    "On-demand wash & detail. Vetted local pros. Book in 60 seconds, professionally cleaned, payment handled. Get it sheened.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sheen",
  authors: [{ name: "Sheen" }],
  appleWebApp: {
    capable: true,
    title: "Sheen",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: "/icons/icon-512.svg",
    shortcut: "/icons/icon-192.svg",
  },
  openGraph: {
    title: "Sheen — Make it look sharp.",
    description: "On-demand wash & detail. Vetted local pros.",
    type: "website",
    siteName: "Sheen",
    images: ["/img/og-default.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sheen — Make it look sharp.",
    description: "On-demand wash & detail. Vetted local pros.",
    images: ["/img/og-default.jpg"],
  },
};

export const viewport = {
  themeColor: "#003594",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="bg-bone text-ink font-sans antialiased [font-feature-settings:'tnum'] min-h-screen">
        <ToastProvider>
          <ToastBridge />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

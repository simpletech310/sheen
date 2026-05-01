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
  // Resolves all relative OG/Twitter image URLs against the public site so
  // Vercel/Next doesn't fall back to localhost when generating per-page meta.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sheen.la"),
  title: {
    default: "Sheen — Make it look sharp.",
    template: "%s · Sheen",
  },
  description:
    "On-demand wash & detail. Vetted local pros. Book in 60 seconds, professionally cleaned, payment handled. Get it sheened.",
  // Default to the customer manifest. Child layouts (`/pro`) override this
  // by exporting their own `metadata.manifest`. The page being viewed when
  // the install button fires determines which manifest the browser reads,
  // so dual-PWA install works without anything fancier.
  manifest: "/manifest-customer.webmanifest",
  applicationName: "Sheen",
  authors: [{ name: "Sheen" }],
  appleWebApp: {
    capable: true,
    title: "Sheen",
    statusBarStyle: "black-translucent",
    startupImage: ["/icons/customer-512.png"],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/customer-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/customer-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/customer-192.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/customer-apple-touch.png",
    shortcut: "/icons/customer-192.png",
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

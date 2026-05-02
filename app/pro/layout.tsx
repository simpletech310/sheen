import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProBottomNav } from "@/components/pro/ProBottomNav";
import { ProDashboardRealtime } from "@/components/pro/ProDashboardRealtime";
import { PWARegister } from "@/components/PWARegister";
import { WelcomeInstallSheet } from "@/components/pwa/WelcomeInstallSheet";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Override the root layout's customer metadata so install prompts under
// /pro use the washer manifest + icons. Next.js merges parent metadata with
// child overrides — we only redefine the bits that should differ.
export const metadata: Metadata = {
  manifest: "/manifest-washer.webmanifest",
  applicationName: "Sheen Pro",
  title: {
    default: "Sheen Pro — your queue, your pay",
    template: "%s · Sheen Pro",
  },
  appleWebApp: {
    capable: true,
    title: "Sheen Pro",
    statusBarStyle: "black-translucent",
    startupImage: ["/icons/washer-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/washer-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/washer-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/washer-192.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/washer-apple-touch.png",
    shortcut: "/icons/washer-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  // Must be signed in to land in /pro/*
  await requireAuth("/sign-in?next=/pro&role=washer");

  // Hard role gate: only washers and admins can browse /pro/*. Customers
  // who wander in get bounced back to their dashboard with a hint.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const role = (profile as any)?.role;
  if (role && role !== "washer" && role !== "admin") {
    redirect("/sign-in?next=/pro&role=washer");
  }

  return (
    <div data-theme="dark" className="min-h-screen flex flex-col bg-ink text-bone">
      <PWARegister enablePush />
      {/* Subscribes to payouts + washer_profiles + own bookings — keeps
          wallet, earnings, /pro/me numbers ticking up the moment they
          change without the washer reaching for refresh. */}
      <ProDashboardRealtime userId={user?.id ?? null} />
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <InstallBanner variant="washer" />
      <ProBottomNav />
      <Suspense fallback={null}>
        <WelcomeInstallSheet variant="washer" />
      </Suspense>
    </div>
  );
}

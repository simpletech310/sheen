import { Suspense } from "react";
import { BottomNav } from "@/components/customer/BottomNav";
import { PWARegister } from "@/components/PWARegister";
import { WelcomeInstallSheet } from "@/components/pwa/WelcomeInstallSheet";
import { InstallBanner } from "@/components/pwa/InstallBanner";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <PWARegister enablePush />
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      {/* Banner sits above the bottom nav — slim, dismissable, theme-aware. */}
      <InstallBanner variant="customer" />
      <BottomNav />
      {/* Welcome sheet only fires when ?welcome=1 lands here for the first time. */}
      <Suspense fallback={null}>
        <WelcomeInstallSheet variant="customer" />
      </Suspense>
    </div>
  );
}

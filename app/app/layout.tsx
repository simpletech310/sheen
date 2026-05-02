import { Suspense } from "react";
import { BottomNav } from "@/components/customer/BottomNav";
import { PWARegister } from "@/components/PWARegister";
import { WelcomeInstallSheet } from "@/components/pwa/WelcomeInstallSheet";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { BookingsRealtime } from "@/components/customer/BookingsRealtime";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Pull the current user once so the realtime subscription can scope to
  // their bookings. Layout is server-side so we don't pay a client roundtrip.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <PWARegister enablePush />
      {/* Subscribes to the customer's bookings; refreshes the current page
          when status flips (matching → matched → en_route → completed). */}
      <BookingsRealtime userId={user?.id ?? null} />
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <InstallBanner variant="customer" />
      <BottomNav />
      <Suspense fallback={null}>
        <WelcomeInstallSheet variant="customer" />
      </Suspense>
    </div>
  );
}

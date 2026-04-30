import { ProBottomNav } from "@/components/pro/ProBottomNav";
import { PWARegister } from "@/components/PWARegister";
import { requireAuth } from "@/lib/auth";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  // Any signed-in user can land on /pro — the queue page itself nudges them
  // to /pro/onboard if they haven't set up Stripe Connect yet. That's softer
  // than a hard redirect from middleware and won't blackhole the whole subtree.
  await requireAuth("/sign-in?next=/pro/queue&role=washer");
  return (
    <div data-theme="dark" className="min-h-screen flex flex-col bg-ink text-bone">
      <PWARegister enablePush />
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <ProBottomNav />
    </div>
  );
}

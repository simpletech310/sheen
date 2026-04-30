import { redirect } from "next/navigation";
import { ProBottomNav } from "@/components/pro/ProBottomNav";
import { PWARegister } from "@/components/PWARegister";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <ProBottomNav />
    </div>
  );
}

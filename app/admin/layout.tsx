import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { l: "Overview", h: "/admin" },
  { l: "Users", h: "/admin/users" },
  { l: "Washers", h: "/admin/washers" },
  { l: "Partners", h: "/admin/partners" },
  { l: "Bookings", h: "/admin/bookings" },
  { l: "Revenue", h: "/admin/revenue" },
  { l: "Claims", h: "/admin/claims" },
  { l: "Audit log", h: "/admin/audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/admin");
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen flex bg-bone">
      <aside className="hidden lg:flex w-60 bg-ink text-bone flex-col p-6 sticky top-0 h-screen">
        <Link href="/admin">
          <Wordmark size={26} invert />
        </Link>
        <div className="font-mono text-[10px] uppercase opacity-60 mt-2">Admin</div>
        <nav className="mt-10 space-y-1 text-sm">
          {navItems.map((n) => (
            <Link
              key={n.h}
              href={n.h}
              className="block py-2 px-3 text-bone/70 hover:bg-bone/10 hover:text-bone uppercase tracking-wide font-medium"
            >
              {n.l}
            </Link>
          ))}
        </nav>
        <div className="mt-auto text-xs text-bone/40">{user.email}</div>
      </aside>
      <main className="flex-1 p-6 md:p-10 max-w-screen-2xl">{children}</main>
    </div>
  );
}

import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createServiceClient();
  const q = searchParams.q?.trim() ?? "";
  let query = supabase
    .from("users")
    .select("id, role, full_name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }
  const { data: users } = await query;

  return (
    <div>
      <Eyebrow>Admin · Users</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">USERS</h1>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search email or name…"
          className="px-4 py-3 bg-bone border border-mist text-sm w-full md:w-96"
        />
      </form>

      <div className="bg-bone border border-mist overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Email</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Name</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Role</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase text-smoke">Created</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-mist last:border-b-0">
                <td className="px-4 py-3 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-xs">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                      u.role === "admin"
                        ? "bg-bad text-bone"
                        : u.role === "washer"
                        ? "bg-royal text-bone"
                        : u.role === "partner_owner"
                        ? "bg-sol text-ink"
                        : "bg-mist text-ink"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-smoke">No users.</div>
        )}
      </div>
    </div>
  );
}

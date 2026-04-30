import { createServiceClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { ClaimActions } from "./ClaimActions";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const supabase = createServiceClient();
  const { data: claims } = await supabase
    .from("damage_claims")
    .select("id, status, description, amount_cents, created_at, booking_id, photos, customer_id, users:customer_id(email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <Eyebrow>Admin · Damage claims</Eyebrow>
      <h1 className="display text-[40px] md:text-[56px] leading-tight mt-3 mb-6">CLAIMS</h1>

      <div className="space-y-3">
        {(claims ?? []).map((c: any) => (
          <div key={c.id} className="bg-bone border border-mist p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-[10px] uppercase text-smoke">
                  Claim #{c.id.slice(0, 8)} · {new Date(c.created_at).toLocaleString()}
                </div>
                <div className="text-sm font-bold mt-1">{c.users?.email}</div>
                <div className="text-xs text-smoke font-mono">Booking: #{c.booking_id?.slice(0, 8)}</div>
              </div>
              <div className="text-right">
                <div className="display tabular text-2xl">{c.amount_cents ? fmtUSD(c.amount_cents) : "—"}</div>
                <span
                  className={`px-2 py-0.5 font-mono text-[10px] uppercase ${
                    c.status === "open"
                      ? "bg-sol text-ink"
                      : c.status === "approved"
                      ? "bg-good text-bone"
                      : c.status === "denied"
                      ? "bg-bad text-bone"
                      : "bg-mist"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            </div>
            <p className="text-sm mt-2">{c.description}</p>
            <ClaimActions claimId={c.id} bookingId={c.booking_id} amountCents={c.amount_cents} status={c.status} />
          </div>
        ))}
        {(claims ?? []).length === 0 && (
          <div className="bg-mist/40 p-6 text-center text-sm text-smoke">No damage claims.</div>
        )}
      </div>
    </div>
  );
}

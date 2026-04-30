import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { fmtUSD } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ProPenaltiesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: penalties } = await supabase
    .from("penalties")
    .select("id, reason, amount_cents, status, notes, created_at, booking_id")
    .eq("user_id", user?.id ?? "")
    .eq("party", "washer")
    .order("created_at", { ascending: false })
    .limit(50);

  const all = penalties ?? [];
  const outstanding = all.filter((p: any) =>
    ["applied", "pending"].includes(p.status)
  );
  const resolved = all.filter((p: any) =>
    ["waived", "disputed"].includes(p.status)
  );
  const outstandingCents = outstanding.reduce(
    (a, p: any) => a + (p.amount_cents ?? 0),
    0
  );

  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← Home
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Penalties
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR FEES</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <div className="bg-bad/15 border-l-2 border-bad p-5 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-1">
          Outstanding
        </div>
        <div className="display tabular text-3xl">−{fmtUSD(outstandingCents)}</div>
        <p className="text-[11px] text-bone/60 mt-2 leading-relaxed">
          Pending fees are withheld from your next payout. Disputes go to{" "}
          <a href="mailto:hello@sheen.co" className="underline text-bone">
            hello@sheen.co
          </a>
          .
        </p>
      </div>

      {outstanding.length > 0 && (
        <>
          <Eyebrow className="!text-bone/60" prefix={null}>
            Open
          </Eyebrow>
          <div className="mt-3 mb-6 space-y-2">
            {outstanding.map((p: any) => (
              <div key={p.id} className="bg-white/5 p-4 border-l-2 border-bad">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold capitalize">
                      {p.reason.replace(/_/g, " ")}
                    </div>
                    {p.notes && (
                      <div className="text-xs text-bone/60 mt-0.5">{p.notes}</div>
                    )}
                    <div className="font-mono text-[10px] text-bone/45 mt-1">
                      {new Date(p.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="display tabular text-bad text-lg ml-3 shrink-0">
                    −{fmtUSD(p.amount_cents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <Eyebrow className="!text-bone/60" prefix={null}>
            History
          </Eyebrow>
          <div className="mt-3 space-y-2">
            {resolved.map((p: any) => (
              <div key={p.id} className="bg-white/5 p-4 opacity-70">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm capitalize">
                      {p.reason.replace(/_/g, " ")}{" "}
                      <span className="font-mono text-[10px] uppercase tracking-wider text-good ml-1">
                        {p.status}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-bone/45 mt-1">
                      {new Date(p.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="display tabular text-bone/60 text-sm ml-3 shrink-0">
                    {fmtUSD(p.amount_cents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {all.length === 0 && (
        <div className="bg-white/5 p-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-good mb-2">
            Clean record
          </div>
          <p className="text-sm text-bone/60">
            No fees on file. Keep showing up sharp.
          </p>
        </div>
      )}
    </div>
  );
}

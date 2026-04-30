"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { fmtUSD } from "@/lib/pricing";
import { ConditionPhotoPicker } from "@/components/customer/ConditionPhotoPicker";
import { writeDraft, readDraft } from "@/lib/booking-draft";

type Vehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  plate: string | null;
  notes: string | null;
  is_default: boolean | null;
};

function VehiclesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") ?? "Premium Detail";
  const price = Number(params.get("price") ?? "18500");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});

  // Load garage + restore prior draft (so back-navigation keeps the picks).
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/vehicles", { cache: "no-store" });
        const d = await r.json();
        if (!alive) return;
        const list: Vehicle[] = d.vehicles ?? [];
        setVehicles(list);

        const draft = readDraft();
        if (draft && draft.tier === tier) {
          // Keep prior selections that still exist in the garage.
          const valid = new Set(list.map((v) => v.id));
          const keep = draft.vehicleIds.filter((id) => valid.has(id));
          setSelected(keep);
          setPhotos(draft.conditionPhotos ?? {});
        } else if (list.length > 0) {
          // First visit: pre-select default vehicle if any, else first.
          const def = list.find((v) => v.is_default) ?? list[0];
          setSelected([def.id]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [tier]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function setVehiclePhotos(vehicleId: string, next: string[]) {
    setPhotos((prev) => ({ ...prev, [vehicleId]: next }));
  }

  function next() {
    if (selected.length === 0) return;
    writeDraft({
      tier,
      price,
      vehicleIds: selected,
      conditionPhotos: photos,
    });
    const url = new URL("/app/book/address", window.location.origin);
    url.searchParams.set("tier", tier);
    url.searchParams.set("price", String(price));
    url.searchParams.set("count", String(selected.length));
    router.push(url.pathname + url.search);
  }

  const total = price * selected.length;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/app/book/auto?tier=${encodeURIComponent(tier)}`}
          className="text-smoke text-sm"
        >
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 2 / 4 · Pick your vehicles</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Which {selected.length === 1 ? "ride" : "rides"}?</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      {loading ? (
        <div className="space-y-2">
          <div className="h-20 w-full bg-mist/60 animate-pulse" />
          <div className="h-20 w-full bg-mist/60 animate-pulse" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-mist/40 p-6 text-sm text-smoke text-center">
          <div className="font-bold uppercase tracking-wide mb-2 text-ink">
            No vehicles in your garage yet
          </div>
          <p className="mb-4">Add at least one to book a wash.</p>
          <Link
            href="/app/garage/new"
            className="inline-block bg-ink text-bone px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-royal"
          >
            Add a vehicle →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-smoke mb-4">
            Tap to include each vehicle. We&rsquo;ll multiply the wash price by the number
            you pick.
          </p>

          <div className="space-y-3">
            {vehicles.map((v) => {
              const isOn = selected.includes(v.id);
              const vPhotos = photos[v.id] ?? [];
              return (
                <div
                  key={v.id}
                  className={`border transition ${
                    isOn ? "border-ink bg-bone" : "border-mist bg-mist/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(v.id)}
                    aria-pressed={isOn}
                    className="w-full text-left p-4 flex justify-between items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">
                        {v.year ? `${v.year} ` : ""}
                        {v.make} {v.model}
                      </div>
                      <div className="text-xs text-smoke mt-0.5">
                        {v.color ?? "—"}
                        {v.plate ? ` · ${v.plate}` : ""}
                      </div>
                      {v.is_default && (
                        <span className="inline-block mt-2 font-mono text-[9px] uppercase tracking-wider bg-royal text-bone px-1.5 py-0.5">
                          Default
                        </span>
                      )}
                    </div>
                    <div
                      className={`shrink-0 w-6 h-6 flex items-center justify-center border-2 transition ${
                        isOn ? "bg-ink border-ink text-bone" : "border-smoke text-transparent"
                      }`}
                      aria-hidden
                    >
                      ✓
                    </div>
                  </button>

                  {isOn && (
                    <div className="border-t border-mist p-4 space-y-3 bg-mist/30">
                      {v.notes && (
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-1">
                            Special instructions
                          </div>
                          <p className="text-xs leading-relaxed text-ink/85">{v.notes}</p>
                        </div>
                      )}
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
                          Pre-wash photos (optional · up to 10)
                        </div>
                        <ConditionPhotoPicker
                          vehicleId={v.id}
                          paths={vPhotos}
                          onChange={(p) => setVehiclePhotos(v.id, p)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link
            href="/app/garage/new"
            className="block mt-3 text-center text-xs text-smoke underline"
          >
            + Add another vehicle to your garage
          </Link>
        </>
      )}

      {/* Sticky total bar */}
      {vehicles.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 -mx-5 mt-7 border-t border-mist bg-bone/95 backdrop-blur supports-[backdrop-filter]:bg-bone/85 px-5 py-4">
          <div className="flex justify-between items-center mb-3 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                {tier}
              </div>
              <div className="text-xs text-smoke">
                {fmtUSD(price)} × {selected.length} vehicle{selected.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="display tabular text-2xl">{fmtUSD(total)}</div>
          </div>
          <button
            onClick={next}
            disabled={selected.length === 0}
            className="w-full bg-royal text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-ink disabled:opacity-50 transition"
          >
            Continue · Where &amp; when →
          </button>
        </div>
      )}
    </div>
  );
}

export default function VehiclesStep() {
  return (
    <Suspense>
      <VehiclesInner />
    </Suspense>
  );
}

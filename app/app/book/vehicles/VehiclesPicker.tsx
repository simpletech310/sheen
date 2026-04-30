"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export function VehiclesPicker({
  tier,
  price,
  handle,
  category = "auto",
  initialVehicles,
}: {
  tier: string;
  price: number;
  handle?: string;
  category?: "auto" | "big_rig";
  initialVehicles: Vehicle[];
}) {
  const router = useRouter();
  const vehicles = initialVehicles;
  const [selected, setSelected] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});

  // Restore draft (so back-navigation keeps the picks).
  useEffect(() => {
    const draft = readDraft();
    if (draft && draft.tier === tier) {
      const valid = new Set(vehicles.map((v) => v.id));
      const keep = draft.vehicleIds.filter((id) => valid.has(id));
      if (keep.length) {
        setSelected(keep);
        setPhotos(draft.conditionPhotos ?? {});
        return;
      }
    }
    if (vehicles.length > 0) {
      const def = vehicles.find((v) => v.is_default) ?? vehicles[0];
      setSelected([def.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    url.searchParams.set("category", category);
    if (handle) url.searchParams.set("handle", handle);
    router.push(url.pathname + url.search);
  }

  const total = price * selected.length;

  if (vehicles.length === 0) {
    const isBigRig = category === "big_rig";
    return (
      <div className="bg-mist/40 p-6 text-sm text-smoke text-center">
        <div className="font-bold uppercase tracking-wide mb-2 text-ink">
          {isBigRig ? "No big rigs in your garage yet" : "No vehicles in your garage yet"}
        </div>
        <p className="mb-4">
          {isBigRig
            ? "Add a big rig (semi · box truck · sprinter · RV) to book this service."
            : "Add at least one to book a wash."}
        </p>
        <Link
          href={isBigRig ? "/app/garage/new?type=big_rig" : "/app/garage/new"}
          className="inline-block bg-ink text-bone px-5 py-3 text-xs font-bold uppercase tracking-wide hover:bg-royal"
        >
          {isBigRig ? "Add a big rig →" : "Add a vehicle →"}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-smoke mb-4">
        Tap to include each vehicle. We&rsquo;ll multiply the wash price by the
        number you pick.
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
        href={category === "big_rig" ? "/app/garage/new?type=big_rig" : "/app/garage/new"}
        className="block mt-3 text-center text-xs text-smoke underline"
      >
        {category === "big_rig" ? "+ Add another rig to your garage" : "+ Add another vehicle to your garage"}
      </Link>

      {/* Sticky total bar */}
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
    </>
  );
}

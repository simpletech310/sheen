"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { AddressAutocomplete } from "@/components/customer/AddressAutocomplete";
import type { GeocodeResult } from "@/lib/mapbox";

const windows = [
  { label: "Today · 2–4 PM", value: "today_14_16" },
  { label: "Today · 4–6 PM", value: "today_16_18" },
  { label: "Tomorrow · 10 AM–12 PM", value: "tomorrow_10_12" },
  { label: "Tomorrow · 2–4 PM", value: "tomorrow_14_16" },
  { label: "Tomorrow · 4–6 PM", value: "tomorrow_16_18" },
];

function AddressFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") ?? "Premium Detail";
  const price = params.get("price") ?? "18500";

  const [picked, setPicked] = useState<GeocodeResult | null>(null);
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [w, setW] = useState(windows[2].value);

  function next() {
    if (!picked) return;
    const url = new URL("/app/book/pay", window.location.origin);
    url.searchParams.set("tier", tier);
    url.searchParams.set("price", price);
    url.searchParams.set("street", picked.name);
    url.searchParams.set("city", picked.city ?? "");
    url.searchParams.set("state", picked.state ?? "CA");
    url.searchParams.set("zip", picked.zip ?? "");
    url.searchParams.set("lat", String(picked.lat));
    url.searchParams.set("lng", String(picked.lng));
    url.searchParams.set("unit", unit);
    url.searchParams.set("notes", notes);
    url.searchParams.set("window", w);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/book/auto?tier=${encodeURIComponent(tier)}`} className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Step 2 / 3 · Address &amp; window</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">WHERE &amp; WHEN</h1>

      <div className="space-y-3">
        <AddressAutocomplete
          onSelect={(r) => setPicked(r)}
          placeholder="Start typing your street address…"
        />
        {picked && (
          <div className="bg-mist/40 px-4 py-3 text-sm">
            <div className="font-bold">{picked.name}</div>
            <div className="text-xs text-smoke">
              {picked.city ? `${picked.city}, ` : ""}
              {picked.state} {picked.zip}
            </div>
          </div>
        )}
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Apt / unit (optional)"
          className="w-full px-4 py-3.5 bg-bone border border-mist text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Driveway notes (water spigot, parking, gate code…)"
          rows={2}
          className="w-full px-4 py-3.5 bg-bone border border-mist text-sm"
        />
      </div>

      <div className="mt-6">
        <Eyebrow>Pick a window</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {windows.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setW(opt.value)}
              className={`text-left p-3 text-sm font-medium ${
                w === opt.value ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={next}
        disabled={!picked}
        className="mt-7 w-full bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-ink"
      >
        Continue · Pay →
      </button>
    </div>
  );
}

export default function AddressPage() {
  return (
    <Suspense>
      <AddressFormInner />
    </Suspense>
  );
}

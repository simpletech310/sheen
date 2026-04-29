"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";

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

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Manhattan Beach");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [w, setW] = useState(windows[2].value);

  function next() {
    const url = new URL("/app/book/pay", window.location.origin);
    url.searchParams.set("tier", tier);
    url.searchParams.set("price", price);
    url.searchParams.set("street", street);
    url.searchParams.set("city", city);
    url.searchParams.set("state", state);
    url.searchParams.set("zip", zip);
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
      <h1 className="display text-3xl mt-3 mb-6">Where &amp; when</h1>

      <div className="bg-cobalt/10 h-40 mb-5 flex items-center justify-center text-cobalt text-xs font-mono uppercase">
        ▢ Map (Mapbox stub — set NEXT_PUBLIC_MAPBOX_TOKEN to enable)
      </div>

      <div className="space-y-3">
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Street address"
          required
          className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="col-span-2 px-4 py-3.5 bg-bone border border-mist rounded-md text-sm"
          />
          <input
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="ST"
            className="px-4 py-3.5 bg-bone border border-mist rounded-md text-sm uppercase"
          />
        </div>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP"
          inputMode="numeric"
          className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Driveway notes (water spigot, parking, gate code…)"
          rows={2}
          className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm"
        />
      </div>

      <div className="mt-6">
        <Eyebrow>Pick a window</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {windows.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setW(opt.value)}
              className={`text-left p-3 text-sm ${
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
        disabled={!street || !zip}
        className="mt-7 w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
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

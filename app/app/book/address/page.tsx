"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { AddressAutocomplete } from "@/components/customer/AddressAutocomplete";
import { WasherHandleInput } from "@/components/customer/WasherHandleInput";
import type { GeocodeResult } from "@/lib/mapbox";

const windows = [
  { label: "Today · 2–4 PM", value: "today_14_16" },
  { label: "Today · 4–6 PM", value: "today_16_18" },
  { label: "Tomorrow · 10 AM–12 PM", value: "tomorrow_10_12" },
  { label: "Tomorrow · 2–4 PM", value: "tomorrow_14_16" },
  { label: "Tomorrow · 4–6 PM", value: "tomorrow_16_18" },
];

type SavedPlace = {
  id: string;
  tag: string | null;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  is_default: boolean | null;
};

function AddressFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") ?? "Premium Detail";
  const price = params.get("price") ?? "18500";
  const count = params.get("count") ?? "1";
  const category = params.get("category") === "home" ? "home" : "auto";

  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [pickedPlaceId, setPickedPlaceId] = useState<string | null>(null);
  const [picked, setPicked] = useState<GeocodeResult | null>(null);
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [w, setW] = useState(windows[2].value);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [washHandle, setWashHandle] = useState(
    (params.get("handle") ?? "").replace(/^@/, "").toUpperCase()
  );

  // Load saved places.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/places", { cache: "no-store" });
        const d = await r.json();
        if (!alive) return;
        const list: SavedPlace[] = d.places ?? [];
        setPlaces(list);
        if (list.length === 0) {
          // No saved places — go straight to autocomplete.
          setShowAutocomplete(true);
        } else {
          // Pre-select default place if any.
          const def = list.find((p) => p.is_default) ?? list[0];
          setPickedPlaceId(def.id);
        }
      } finally {
        if (alive) setLoadingPlaces(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function pickSavedPlace(id: string) {
    setPickedPlaceId(id);
    setPicked(null);
    setShowAutocomplete(false);
  }

  function next() {
    let street = "",
      city = "",
      state = "CA",
      zip = "",
      lat: number | null = null,
      lng: number | null = null,
      placeNotes = notes;

    if (pickedPlaceId) {
      const p = places.find((x) => x.id === pickedPlaceId);
      if (!p) return;
      street = p.street ?? "";
      city = p.city ?? "";
      state = p.state ?? "CA";
      zip = p.zip ?? "";
      lat = p.lat ?? null;
      lng = p.lng ?? null;
      // Use saved notes if user hasn't typed anything in the wash-specific notes box.
      placeNotes = notes || (p.notes ?? "");
    } else if (picked) {
      street = picked.name;
      city = picked.city ?? "";
      state = picked.state ?? "CA";
      zip = picked.zip ?? "";
      lat = picked.lat;
      lng = picked.lng;
    } else {
      return;
    }

    const url = new URL("/app/book/pay", window.location.origin);
    url.searchParams.set("tier", tier);
    url.searchParams.set("price", price);
    url.searchParams.set("count", count);
    url.searchParams.set("category", category);
    url.searchParams.set("street", street);
    url.searchParams.set("city", city);
    url.searchParams.set("state", state);
    url.searchParams.set("zip", zip);
    if (lat != null) url.searchParams.set("lat", String(lat));
    if (lng != null) url.searchParams.set("lng", String(lng));
    url.searchParams.set("unit", unit);
    url.searchParams.set("notes", placeNotes);
    url.searchParams.set("window", w);
    if (washHandle.trim()) url.searchParams.set("handle", washHandle.trim().toUpperCase());
    router.push(url.pathname + url.search);
  }

  const canContinue = !!pickedPlaceId || !!picked;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={
            category === "home"
              ? `/app/book/home?tier=${encodeURIComponent(tier)}`
              : `/app/book/vehicles?tier=${encodeURIComponent(tier)}&price=${price}`
          }
          className="text-smoke text-sm"
        >
          ← Back
        </Link>
      </div>
      <Eyebrow>
        Step {category === "home" ? "2 / 3" : "3 / 4"} · Where &amp; when
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Where &amp; when</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      {!loadingPlaces && places.length > 0 && (
        <div className="mb-5">
          <Eyebrow>Saved places</Eyebrow>
          <div className="mt-3 space-y-2">
            {places.map((p) => {
              const isOn = pickedPlaceId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickSavedPlace(p.id)}
                  className={`w-full text-left p-4 transition border ${
                    isOn ? "border-ink bg-bone" : "border-mist bg-mist/40 hover:bg-mist"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">
                          {p.tag ?? "PLACE"}
                        </span>
                        {p.is_default && (
                          <span className="font-mono text-[9px] uppercase tracking-wider bg-royal text-bone px-1.5 py-0.5">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-0.5">{p.street}</div>
                      <div className="text-xs text-smoke">
                        {p.city}, {p.state} {p.zip}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        isOn ? "bg-ink border-ink" : "border-smoke"
                      }`}
                      aria-hidden
                    >
                      {isOn && <div className="w-2 h-2 rounded-full bg-bone" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAutocomplete((s) => !s);
              if (!showAutocomplete) setPickedPlaceId(null);
            }}
            className="mt-3 text-xs text-smoke underline"
          >
            {showAutocomplete ? "Use a saved place" : "+ Use a different address"}
          </button>
        </div>
      )}

      {showAutocomplete && (
        <div className="space-y-3 mb-5">
          <Eyebrow>New address</Eyebrow>
          <AddressAutocomplete
            onSelect={(r) => {
              setPicked(r);
              setPickedPlaceId(null);
            }}
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
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Driveway notes for this wash (water spigot, parking, gate code…)"
        rows={2}
        className="w-full px-4 py-3 bg-bone border border-mist text-sm"
      />

      <div className="mt-6">
        <Eyebrow>Request a specific pro · optional</Eyebrow>
        <div className="mt-3">
          <WasherHandleInput value={washHandle} onChange={setWashHandle} />
        </div>
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
        disabled={!canContinue}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { GeocodeResult } from "@/lib/mapbox";

type Place = {
  id?: string;
  tag?: string | null;
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  is_default?: boolean | null;
};

const TAGS = ["HOME", "OFFICE", "OTHER"];

export function PlaceForm({ initial, mode }: { initial?: Place; mode: "new" | "edit" }) {
  const router = useRouter();
  const [tag, setTag] = useState(initial?.tag ?? "HOME");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isDefault, setIsDefault] = useState(!!initial?.is_default);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleAutocomplete(r: GeocodeResult) {
    setStreet(r.name || r.full_address.split(",")[0] || "");
    setCity(r.city ?? "");
    setState(r.state ?? "");
    setZip(r.zip ?? "");
    setLat(r.lat);
    setLng(r.lng);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const url = mode === "new" ? "/api/places" : `/api/places/${initial?.id}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag,
          street,
          unit: unit || null,
          city,
          state,
          zip,
          lat,
          lng,
          notes: notes || null,
          is_default: isDefault,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      router.push("/app/places");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-wider transition ${
              tag === t ? "bg-ink text-bone" : "bg-mist/40 text-ink hover:bg-mist"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AddressAutocomplete
        value={street}
        onSelect={handleAutocomplete}
        placeholder="Search street address"
      />
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="Apt / Unit (optional)"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          required
          className="col-span-2 px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          placeholder="State"
          maxLength={2}
          required
          className="px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="ZIP"
        inputMode="numeric"
        maxLength={5}
        required
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Gate code, parking notes, etc. (optional)"
        rows={2}
        className="w-full px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 accent-royal"
        />
        Make this my default place
      </label>

      {err && <div className="text-sm text-bad">{err}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !street || !city || !state || !zip}
          className="flex-1 bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "new" ? "Save place" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/app/places")}
          className="px-5 bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

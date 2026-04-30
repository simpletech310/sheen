"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

type Vehicle = {
  id?: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  plate?: string | null;
  is_default?: boolean | null;
};

export function VehicleForm({ initial, mode }: { initial?: Vehicle; mode: "new" | "edit" }) {
  const router = useRouter();
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [isDefault, setIsDefault] = useState(!!initial?.is_default);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const url = mode === "new" ? "/api/vehicles" : `/api/vehicles/${initial?.id}`;
      const method = mode === "new" ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: year || null,
          make,
          model,
          color: color || null,
          plate: plate || null,
          is_default: isDefault,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast(mode === "new" ? "Vehicle added" : "Vehicle updated", "success");
      router.push("/app/garage");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || "Could not save vehicle", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year"
          inputMode="numeric"
          maxLength={4}
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={make}
          onChange={(e) => setMake(e.target.value)}
          placeholder="Make"
          required
          className="col-span-2 px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="Model"
        required
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="Color"
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="License plate"
          maxLength={10}
          className="px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
        />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 accent-royal"
        />
        Make this my default vehicle
      </label>

      {err && <div className="text-sm text-bad">{err}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !make || !model}
          className="flex-1 bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "new" ? "Add vehicle" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/app/garage")}
          className="px-5 bg-mist text-ink py-3.5 text-sm font-bold uppercase tracking-wide"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

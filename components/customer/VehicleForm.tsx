"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { VehiclePhotoPicker } from "./VehiclePhotoPicker";

type Vehicle = {
  id?: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  plate?: string | null;
  notes?: string | null;
  photo_paths?: string[] | null;
  is_default?: boolean | null;
  vehicle_type?: string | null;
  vehicle_class?: string | null;
};

const VEHICLE_CLASSES: { value: string; label: string }[] = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "coupe", label: "Coupe" },
  { value: "sports", label: "Sports" },
  { value: "van", label: "Van / minivan" },
  { value: "wagon", label: "Wagon" },
  { value: "hatchback", label: "Hatchback" },
  { value: "ev", label: "EV" },
  { value: "classic", label: "Classic" },
  { value: "other", label: "Other" },
];

export function VehicleForm({ initial, mode }: { initial?: Vehicle; mode: "new" | "edit" }) {
  const router = useRouter();
  const params = useSearchParams();
  // Default new vehicles to the type the URL nudges us toward (e.g.
  // /app/garage/new?type=big_rig from the booking flow's empty state).
  const initialType =
    initial?.vehicle_type === "big_rig"
      ? "big_rig"
      : params.get("type") === "big_rig" && mode === "new"
      ? "big_rig"
      : "auto";
  const [vehicleType, setVehicleType] = useState<"auto" | "big_rig">(initialType as any);
  const [vehicleClass, setVehicleClass] = useState<string>(initial?.vehicle_class ?? "");
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [photoPaths, setPhotoPaths] = useState<string[]>(initial?.photo_paths ?? []);
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
          notes: notes.trim() || null,
          photo_paths: photoPaths,
          is_default: isDefault,
          vehicle_type: vehicleType,
          vehicle_class: vehicleClass || null,
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
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Vehicle type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVehicleType("auto")}
            className={`p-3 text-left transition border ${
              vehicleType === "auto"
                ? "border-ink bg-ink text-bone"
                : "border-mist bg-mist/40 text-ink hover:bg-mist"
            }`}
          >
            <div className="font-bold text-sm">Auto</div>
            <div className={`text-[11px] mt-0.5 ${vehicleType === "auto" ? "text-bone/70" : "text-smoke"}`}>
              Sedan · SUV · truck · coupe
            </div>
          </button>
          <button
            type="button"
            onClick={() => setVehicleType("big_rig")}
            className={`p-3 text-left transition border ${
              vehicleType === "big_rig"
                ? "border-sol bg-royal text-bone"
                : "border-mist bg-mist/40 text-ink hover:bg-mist"
            }`}
          >
            <div className="font-bold text-sm">Big rig</div>
            <div className={`text-[11px] mt-0.5 ${vehicleType === "big_rig" ? "text-bone/70" : "text-smoke"}`}>
              Semi · box truck · sprinter · RV
            </div>
          </button>
        </div>
      </div>

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
      {vehicleType === "auto" && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
            Body style
          </label>
          <select
            value={vehicleClass}
            onChange={(e) => setVehicleClass(e.target.value)}
            className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
          >
            <option value="">Pick one (helps your pro come prepared)</option>
            {VEHICLE_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
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
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Special instructions for your pro
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ceramic coated — pH-neutral soap only. Watch the rear bumper, small ding. Hand-dry, no air blower."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <div className="text-[11px] text-smoke mt-1">
          Pros see this on every booking of this vehicle.
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Photos of this vehicle (optional)
        </label>
        <VehiclePhotoPicker
          paths={photoPaths}
          scope={`vehicle_${initial?.id ?? "new"}`}
          onChange={setPhotoPaths}
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

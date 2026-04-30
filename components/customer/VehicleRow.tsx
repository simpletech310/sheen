"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleForm } from "./VehicleForm";

type Vehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  plate: string | null;
  is_default: boolean | null;
};

export function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm("Remove this vehicle?")) return;
    setDeleting(true);
    const r = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    if (r.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      alert("Could not remove vehicle.");
    }
  }

  if (editing) {
    return (
      <div className="bg-bone border border-mist p-4">
        <div className="font-mono text-[10px] text-smoke uppercase mb-3">Edit vehicle</div>
        <VehicleForm mode="edit" initial={vehicle} />
        <button
          onClick={() => setEditing(false)}
          className="mt-2 text-xs text-smoke underline"
        >
          Cancel edit
        </button>
      </div>
    );
  }

  return (
    <div className="bg-mist/40 hover:bg-mist transition p-4 flex justify-between items-start gap-3">
      <div className="flex-1">
        <div className="text-sm font-semibold">
          {vehicle.year ? `${vehicle.year} ` : ""}
          {vehicle.make} {vehicle.model}
        </div>
        <div className="text-xs text-smoke mt-0.5">
          {vehicle.color ?? "—"}
          {vehicle.plate ? ` · plate ${vehicle.plate}` : ""}
        </div>
        {vehicle.is_default && (
          <span className="inline-block mt-2 font-mono text-[10px] uppercase tracking-wider bg-royal text-bone px-2 py-0.5">
            Default
          </span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="font-mono text-[10px] uppercase tracking-wider text-ink hover:text-royal"
        >
          Edit
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="font-mono text-[10px] uppercase tracking-wider text-bad hover:underline disabled:opacity-50"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

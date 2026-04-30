"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleForm } from "./VehicleForm";
import { toast } from "@/components/ui/Toast";

type Vehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  plate: string | null;
  notes: string | null;
  photo_paths: string[] | null;
  is_default: boolean | null;
};

const PUBLIC_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/booking-photos`;

export function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm("Remove this vehicle?")) return;
    setDeleting(true);
    const r = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    if (r.ok) {
      toast("Vehicle removed", "success");
      router.refresh();
    } else {
      setDeleting(false);
      toast("Could not remove vehicle", "error");
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

  const photos = vehicle.photo_paths ?? [];
  const heroPhoto = photos[0];

  return (
    <div className="bg-mist/40 hover:bg-mist transition p-4 flex gap-3 items-start">
      {heroPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`${PUBLIC_BASE}/${heroPhoto}`}
          alt=""
          className="w-16 h-16 object-cover bg-mist border border-mist shrink-0"
        />
      ) : (
        <div className="w-16 h-16 bg-mist border border-mist flex items-center justify-center shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-wider text-smoke">
            No photo
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">
          {vehicle.year ? `${vehicle.year} ` : ""}
          {vehicle.make} {vehicle.model}
        </div>
        <div className="text-xs text-smoke mt-0.5">
          {vehicle.color ?? "—"}
          {vehicle.plate ? ` · plate ${vehicle.plate}` : ""}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {vehicle.is_default && (
            <span className="font-mono text-[10px] uppercase tracking-wider bg-royal text-bone px-2 py-0.5">
              Default
            </span>
          )}
          {photos.length > 1 && (
            <span className="font-mono text-[10px] uppercase tracking-wider bg-mist text-smoke px-2 py-0.5">
              {photos.length} photos
            </span>
          )}
          {vehicle.notes && (
            <span className="font-mono text-[10px] uppercase tracking-wider bg-sol/30 text-ink px-2 py-0.5">
              ★ Notes
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
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

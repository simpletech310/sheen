"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceForm } from "./PlaceForm";

type Place = {
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

export function PlaceRow({ place }: { place: Place }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm("Remove this place?")) return;
    setDeleting(true);
    const r = await fetch(`/api/places/${place.id}`, { method: "DELETE" });
    if (r.ok) {
      router.refresh();
    } else {
      setDeleting(false);
      alert("Could not remove place.");
    }
  }

  if (editing) {
    return (
      <div className="bg-bone border border-mist p-4">
        <div className="font-mono text-[10px] text-smoke uppercase mb-3">Edit place</div>
        <PlaceForm mode="edit" initial={place} />
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
    <div className="bg-mist/40 hover:bg-mist transition p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-smoke uppercase tracking-wider">
              {place.tag ?? "ADDRESS"}
            </span>
            {place.is_default && (
              <span className="font-mono text-[10px] uppercase tracking-wider bg-royal text-bone px-2 py-0.5">
                Default
              </span>
            )}
          </div>
          <div className="text-sm font-semibold mt-1">
            {place.street}
            {place.unit ? `, ${place.unit}` : ""}
          </div>
          <div className="text-xs text-smoke">
            {place.city}, {place.state} {place.zip}
          </div>
          {place.notes && <div className="text-xs text-smoke mt-1">{place.notes}</div>}
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
    </div>
  );
}

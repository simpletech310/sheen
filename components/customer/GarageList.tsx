"use client";

import { type ReactNode, useEffect, useState } from "react";
import { VehicleRow } from "./VehicleRow";

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
  vehicle_type?: string | null;
};

const PENDING_KEY = "sheen.pendingVehicle";

export function GarageList({
  initialVehicles,
  emptyState,
}: {
  initialVehicles: Vehicle[];
  emptyState: ReactNode;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);

  // VehicleForm stashes the freshly-saved vehicle here before navigating
  // back to /app/garage so the row appears on the very first paint, instead
  // of waiting on the server component to refetch (which sometimes lags
  // behind the just-completed insert).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PENDING_KEY);
      const pending = JSON.parse(raw) as Vehicle | null;
      if (!pending?.id) return;
      setVehicles((prev) =>
        prev.some((v) => v.id === pending.id) ? prev : [pending, ...prev]
      );
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
  }, []);

  if (vehicles.length === 0) return <>{emptyState}</>;

  return (
    <div className="space-y-3">
      {vehicles.map((v) => (
        <VehicleRow key={v.id} vehicle={v} />
      ))}
    </div>
  );
}

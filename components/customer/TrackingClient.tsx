"use client";

import { useEffect, useState } from "react";
import { TrackingMap } from "./TrackingMap";
import { createClient } from "@/lib/supabase/client";

const statusOrder = ["pending", "matched", "en_route", "arrived", "in_progress", "completed"] as const;
type Status = (typeof statusOrder)[number];
const statusLabel: Record<string, string> = {
  pending: "Matching pro",
  matched: "Pro matched",
  en_route: "En route",
  arrived: "Arrived",
  in_progress: "Cleaning",
  completed: "Done",
};

export function TrackingClient({
  bookingId,
  initialStatus,
  customerLat,
  customerLng,
  initialWasherId,
}: {
  bookingId: string;
  initialStatus: string;
  customerLat: number;
  customerLng: number;
  initialWasherId: string | null;
}) {
  const [status, setStatus] = useState<Status>((initialStatus as Status) ?? "pending");
  const [washerId, setWasherId] = useState<string | null>(initialWasherId);
  const [washerPos, setWasherPos] = useState<{ lat: number; lng: number } | null>(null);

  // Subscribe to booking row for status changes
  useEffect(() => {
    const supa = createClient();
    const ch = supa
      .channel(`booking:${bookingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload) => {
          const row = payload.new as { status: Status; assigned_washer_id: string | null };
          setStatus(row.status);
          setWasherId(row.assigned_washer_id);
        }
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [bookingId]);

  // Subscribe to washer position when a washer is assigned
  useEffect(() => {
    if (!washerId) return;
    const supa = createClient();

    // Initial fetch
    (async () => {
      const { data } = await supa
        .from("washer_positions")
        .select("lat, lng")
        .eq("washer_id", washerId)
        .maybeSingle();
      if (data) setWasherPos({ lat: Number(data.lat), lng: Number(data.lng) });
    })();

    const ch = supa
      .channel(`washer-pos:${washerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "washer_positions", filter: `washer_id=eq.${washerId}` },
        (payload) => {
          const row = payload.new as { lat: number; lng: number };
          if (row?.lat && row?.lng) setWasherPos({ lat: Number(row.lat), lng: Number(row.lng) });
        }
      )
      .subscribe();

    return () => {
      ch.unsubscribe();
    };
  }, [washerId]);

  const idx = statusOrder.indexOf(status);

  return (
    <>
      <TrackingMap customer={{ lat: customerLat, lng: customerLng }} washer={washerPos} height={260} />

      <div className="space-y-2.5 mt-5">
        {statusOrder.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-3 p-3 ${
              i <= idx ? "bg-ink text-bone" : "bg-mist/40 text-smoke"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < idx ? "bg-sol text-ink" : i === idx ? "bg-bone text-ink" : "bg-mist text-smoke"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span className="text-sm font-medium">{statusLabel[s]}</span>
            {i === idx && <span className="ml-auto font-mono text-[11px]">ACTIVE</span>}
          </div>
        ))}
      </div>
    </>
  );
}

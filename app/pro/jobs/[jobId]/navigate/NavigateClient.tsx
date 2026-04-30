"use client";

import { useEffect, useRef } from "react";
import { NavigateMap } from "@/components/pro/NavigateMap";

export function NavigateClient({
  destination,
}: {
  jobId: string;
  destination: { lat: number; lng: number };
}) {
  const lastSentRef = useRef<number>(0);

  // Push washer position every ~10s while on this page
  useEffect(() => {
    if (!navigator.geolocation) return;
    let watchId: number;
    try {
      watchId = navigator.geolocation.watchPosition(
        async (p) => {
          const now = Date.now();
          if (now - lastSentRef.current < 8000) return; // throttle
          lastSentRef.current = now;
          await fetch("/api/pro/position", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              heading: p.coords.heading ?? undefined,
              speed_mph: p.coords.speed != null ? Math.round(p.coords.speed * 2.237) : undefined,
            }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } catch {
      /* permission denied — silent */
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <div className="mb-5">
      <NavigateMap destination={destination} height={320} />
    </div>
  );
}

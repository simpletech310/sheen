"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function NavigateMap({
  destination,
  height = 320,
}: {
  destination: { lat: number; lng: number };
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [destination.lng, destination.lat],
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;

    const destEl = document.createElement("div");
    destEl.style.cssText = "width:24px;height:24px;border-radius:50%;background:#FFA300;border:3px solid #FAFAF7;";
    new mapboxgl.Marker({ element: destEl }).setLngLat([destination.lng, destination.lat]).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [destination.lat, destination.lng]);

  // Add my pin + draw a straight line (route line via Directions API is a follow-up).
  useEffect(() => {
    if (!mapRef.current || !me) return;
    const meEl = document.createElement("div");
    meEl.style.cssText = "width:18px;height:18px;border-radius:50%;background:#003594;border:3px solid #FFA300;box-shadow:0 0 0 6px rgba(0,53,148,0.25);";
    new mapboxgl.Marker({ element: meEl }).setLngLat([me.lng, me.lat]).addTo(mapRef.current);

    const bounds = new mapboxgl.LngLatBounds()
      .extend([destination.lng, destination.lat])
      .extend([me.lng, me.lat]);
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
  }, [me, destination.lat, destination.lng]);

  if (!TOKEN) {
    return (
      <div
        className="bg-cobalt/20 flex items-center justify-center text-cobalt text-xs font-mono uppercase"
        style={{ height }}
      >
        ▢ Navigate map (Mapbox token missing)
      </div>
    );
  }

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

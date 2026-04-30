"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Pin = { lat: number; lng: number };

export function TrackingMap({
  customer,
  washer,
  height = 280,
}: {
  customer: Pin;
  washer?: Pin | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const customerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const washerMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [customer.lng, customer.lat],
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;

    const customerEl = document.createElement("div");
    customerEl.style.cssText = "width:18px;height:18px;border-radius:50%;background:#0A0A0A;border:3px solid #FAFAF7;box-shadow:0 0 0 2px #0A0A0A;";
    customerMarkerRef.current = new mapboxgl.Marker({ element: customerEl })
      .setLngLat([customer.lng, customer.lat])
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update washer marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!washer) {
      washerMarkerRef.current?.remove();
      washerMarkerRef.current = null;
      return;
    }
    if (!washerMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText = "width:24px;height:24px;border-radius:50%;background:#003594;border:3px solid #FFA300;box-shadow:0 2px 8px rgba(0,0,0,0.3);";
      washerMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([washer.lng, washer.lat])
        .addTo(mapRef.current);
    } else {
      washerMarkerRef.current.setLngLat([washer.lng, washer.lat]);
    }
    // Fit bounds to both pins
    const bounds = new mapboxgl.LngLatBounds()
      .extend([customer.lng, customer.lat])
      .extend([washer.lng, washer.lat]);
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 14 });
  }, [washer, customer.lng, customer.lat]);

  if (!TOKEN) {
    return (
      <div
        className="bg-cobalt/10 flex items-center justify-center text-cobalt text-xs font-mono uppercase"
        style={{ height }}
      >
        ▢ Live map (Mapbox token missing)
      </div>
    );
  }

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Approximate degrees-per-mile along latitude (constant) and longitude
// (varies with cos(lat)). Good enough for a UI radius preview — not
// precise enough for routing.
function radiusPolygon(
  center: [number, number],
  radiusMiles: number,
  sides = 64
): GeoJSON.Polygon {
  const km = radiusMiles * 1.609344;
  const dY = km / 110.574; // degrees latitude per km
  const dX = km / (111.320 * Math.cos((center[1] * Math.PI) / 180));
  const ring: number[][] = [];
  for (let i = 0; i < sides; i++) {
    const t = (i / sides) * 2 * Math.PI;
    ring.push([center[0] + dX * Math.cos(t), center[1] + dY * Math.sin(t)]);
  }
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

// Pick a zoom level that comfortably frames `radiusMiles` around `center`.
// The 256 / r factor leaves a small margin so the circle doesn't kiss the
// map edge.
function zoomForRadius(lat: number, radiusMiles: number, viewportPx = 320) {
  const meters = radiusMiles * 1609.344;
  const metersPerPixelAtZoom0 = 156543.03392 * Math.cos((lat * Math.PI) / 180);
  // we want diameter (2*radius) to fit in ~viewportPx with margin (0.7)
  const targetMetersPerPixel = (2 * meters) / (viewportPx * 0.7);
  return Math.max(3, Math.log2(metersPerPixelAtZoom0 / targetMetersPerPixel));
}

export function ServiceRadiusMap({
  lat,
  lng,
  radiusMiles,
  height = 240,
}: {
  lat: number;
  lng: number;
  radiusMiles: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Initial map setup — runs once. Center/zoom updates happen in the next effect.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const zoom = zoomForRadius(lat, radiusMiles);
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom,
      attributionControl: false,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("radius", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: radiusPolygon([lng, lat], radiusMiles),
          properties: {},
        } as GeoJSON.Feature,
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#FFA300", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#FFA300", "line-width": 2 },
      });

      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:50%;background:#0A0A0A;border:3px solid #FAFAF7;box-shadow:0 0 0 2px #0A0A0A;";
      new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When radius (or center) changes, re-fit and update the polygon in place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("radius") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: "Feature",
          geometry: radiusPolygon([lng, lat], radiusMiles),
          properties: {},
        } as GeoJSON.Feature);
      }
      map.easeTo({ center: [lng, lat], zoom: zoomForRadius(lat, radiusMiles), duration: 350 });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [lat, lng, radiusMiles]);

  if (!TOKEN) {
    return (
      <div
        className="bg-white/5 text-bone/50 text-xs flex items-center justify-center"
        style={{ height }}
      >
        Map unavailable (no Mapbox token).
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="w-full bg-mist" />;
}

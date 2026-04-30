// Mapbox helpers — uses MAPBOX_SECRET_TOKEN for server-side geocoding,
// NEXT_PUBLIC_MAPBOX_TOKEN is exposed to the client for map rendering.

const MAPBOX_API = "https://api.mapbox.com";

export type GeocodeResult = {
  id: string;
  name: string;             // street + number
  full_address: string;     // formatted
  city?: string;
  state?: string;
  zip?: string;
  lat: number;
  lng: number;
};

const token = () => process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Forward geocode a free-text query → list of results (search-as-you-type). */
export async function geocodeForward(query: string, opts?: { proximity?: { lat: number; lng: number } }): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    access_token: token() ?? "",
    country: "us",
    types: "address",
    limit: "6",
  });
  if (opts?.proximity) params.set("proximity", `${opts.proximity.lng},${opts.proximity.lat}`);
  const res = await fetch(`${MAPBOX_API}/search/geocode/v6/forward?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map((f: any) => {
    const p = f.properties ?? {};
    const ctx = p.context ?? {};
    return {
      id: f.id,
      name: p.name ?? p.full_address ?? "",
      full_address: p.full_address ?? p.place_formatted ?? p.name ?? "",
      city: ctx.place?.name,
      state: ctx.region?.region_code,
      zip: ctx.postcode?.name,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    } satisfies GeocodeResult;
  });
}

/** Reverse geocode lat/lng → nearest address. */
export async function geocodeReverse(lat: number, lng: number): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    longitude: String(lng),
    latitude: String(lat),
    access_token: token() ?? "",
    types: "address",
  });
  const res = await fetch(`${MAPBOX_API}/search/geocode/v6/reverse?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.features?.[0];
  if (!f) return null;
  const p = f.properties ?? {};
  const ctx = p.context ?? {};
  return {
    id: f.id,
    name: p.name ?? p.full_address ?? "",
    full_address: p.full_address ?? p.place_formatted ?? p.name ?? "",
    city: ctx.place?.name,
    state: ctx.region?.region_code,
    zip: ctx.postcode?.name,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  };
}

/** Cheap haversine distance in miles. */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

import { NextResponse } from "next/server";
import { geocodeForward, geocodeReverse } from "@/lib/mapbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  if (lat && lng) {
    const r = await geocodeReverse(Number(lat), Number(lng));
    return NextResponse.json({ result: r });
  }
  if (q) {
    const proximity =
      url.searchParams.get("near_lat") && url.searchParams.get("near_lng")
        ? {
            lat: Number(url.searchParams.get("near_lat")),
            lng: Number(url.searchParams.get("near_lng")),
          }
        : undefined;
    const results = await geocodeForward(q, { proximity });
    return NextResponse.json({ results });
  }
  return NextResponse.json({ error: "missing q or lat/lng" }, { status: 400 });
}

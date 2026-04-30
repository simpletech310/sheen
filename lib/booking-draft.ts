// Small helper for carrying a booking draft across the multi-step flow.
// Lives in sessionStorage — it dies when the tab closes (good, we don't
// want stale picks polluting future bookings) and is per-tab so multiple
// books in different tabs don't stomp each other.

const KEY = "sheen.bookingDraft.v1";

export type BookingDraft = {
  tier: string;
  price: number; // service cents (single-vehicle base)
  vehicleIds: string[];
  conditionPhotos: Record<string, string[]>; // vehicle_id → storage paths
};

export function readDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(d: BookingDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

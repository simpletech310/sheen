// Shared capability matcher used by the queue filter (server + realtime
// client) and the claim endpoints (washer + partner + accept-request).
// Single source of truth: if a service's `requires_*` flag is true, the
// washer must have the matching capability OR (for water/power) the site
// must provide it.

export type WasherCapabilities = {
  has_own_water: boolean | null | undefined;
  has_own_power: boolean | null | undefined;
  has_pressure_washer: boolean | null | undefined;
  can_detail_interior: boolean | null | undefined;
  can_do_paint_correction: boolean | null | undefined;
  can_wash_big_rig: boolean | null | undefined;
};

export type ServiceRequirements = {
  category?: string | null;
  requires_water?: boolean | null;
  requires_power?: boolean | null;
  requires_pressure_washer?: boolean | null;
  requires_paint_correction?: boolean | null;
  requires_interior_detail?: boolean | null;
};

export type SiteCapabilities = {
  has_water?: boolean | null;
  has_power?: boolean | null;
};

export type CapabilityCheck = {
  ok: boolean;
  reasons: string[]; // human-readable misses, e.g. "needs a pressure washer"
};

const TRUE = (v: boolean | null | undefined) => v === true;

// Returns ok=false with the specific gaps so we can show the washer exactly
// why a job isn't eligible (or hide it silently in the queue).
export function checkWasherEligibility(
  service: ServiceRequirements | null | undefined,
  site: SiteCapabilities | null | undefined,
  washer: WasherCapabilities | null | undefined
): CapabilityCheck {
  if (!service || !washer) return { ok: true, reasons: [] };
  const reasons: string[] = [];

  // Big rig is its own dimension — uses category, not a requires_* flag.
  if (service.category === "big_rig" && !TRUE(washer.can_wash_big_rig)) {
    reasons.push("not approved for big rigs");
  }

  // Equipment requirements live on the service. A washer either has the
  // capability flagged on their profile or they don't qualify.
  if (TRUE(service.requires_pressure_washer) && !TRUE(washer.has_pressure_washer)) {
    reasons.push("needs a pressure washer");
  }
  if (TRUE(service.requires_paint_correction) && !TRUE(washer.can_do_paint_correction)) {
    reasons.push("needs paint correction kit");
  }
  if (TRUE(service.requires_interior_detail) && !TRUE(washer.can_detail_interior)) {
    reasons.push("needs interior detailing");
  }

  // Site-dependent reqs: if the customer doesn't have water on-site, only
  // BYO-water washers can take it. Unknown (null) is treated as "site has
  // it" — matches the legacy default before this column existed.
  if (TRUE(service.requires_water) && site?.has_water === false && !TRUE(washer.has_own_water)) {
    reasons.push("no water on-site & you don't BYO");
  }
  if (TRUE(service.requires_power) && site?.has_power === false && !TRUE(washer.has_own_power)) {
    reasons.push("no power on-site & you don't BYO");
  }

  return { ok: reasons.length === 0, reasons };
}

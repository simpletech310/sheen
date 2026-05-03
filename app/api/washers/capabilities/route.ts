import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAddonByCode } from "@/lib/addons";
import { tierRank, type Tier } from "@/lib/tier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH body: { capabilities: { interior_shampoo: true, ... } }
// Replaces the washer's capabilities map. Each key must be a known
// addon code from the catalog AND the washer's tier must clear that
// addon's required_tier — otherwise the flip is rejected.
//
// Why server-side enforcement: the UI dims locked addons, but a
// capable user could POST anything. The catalog (addons.ts) is the
// only source of truth for which codes are real and what tier each
// requires.
const Body = z.object({
  capabilities: z.record(z.string(), z.boolean()),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("user_id, tier, capabilities")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wp) return NextResponse.json({ error: "Not a washer" }, { status: 403 });

  const myTier: Tier = (wp.tier ?? "rookie") as Tier;
  const myRank = tierRank(myTier);
  const merged: Record<string, boolean> = { ...(wp.capabilities ?? {}) };
  const rejected: string[] = [];

  for (const [code, on] of Object.entries(body.capabilities)) {
    const addon = getAddonByCode(code);
    if (!addon) {
      rejected.push(code);
      continue;
    }
    if (on) {
      if (tierRank(addon.required_tier) > myRank) {
        // Tier too low — silently keep the flag off. UI shouldn't
        // have offered it; don't 400 the whole request because the
        // user might be flipping a batch where one slipped through.
        merged[code] = false;
        rejected.push(code);
        continue;
      }
      merged[code] = true;
    } else {
      merged[code] = false;
    }
  }

  const { error } = await supabase
    .from("washer_profiles")
    .update({ capabilities: merged })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, capabilities: merged, rejected });
}

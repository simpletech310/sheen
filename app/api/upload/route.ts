import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  bucket: z.enum([
    "booking-photos",
    "insurance-docs",
    "partner-portfolio",
    "claim-evidence",
    "washer-documents",
  ]),
  // booking_id / claim_id / etc. for path namespacing — caller supplies whatever it needs
  scope: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_\-]+$/),
  // file extension only (no dots), e.g. "jpg", "png", "pdf"
  ext: z.string().regex(/^[a-z0-9]{1,8}$/),
});

/**
 * POST /api/upload
 * Body: { bucket, scope, ext }
 * Returns: { path, signed_url, token }
 *
 * Caller PUTs the file directly to signed_url with content-type matching the ext.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const path = `${body.scope}/${user.id}/${crypto.randomUUID()}.${body.ext}`;
  const { data, error } = await supabase.storage
    .from(body.bucket)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    path,
    signed_url: data.signedUrl,
    token: data.token,
    bucket: body.bucket,
  });
}

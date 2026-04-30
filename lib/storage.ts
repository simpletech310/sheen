import { createServiceClient } from "@/lib/supabase/server";

/** Get short-lived signed URLs for an array of storage paths. */
export async function signedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supa = createServiceClient();
  const out: Record<string, string> = {};
  // createSignedUrls takes an array but returns nullable urls — handle both.
  const { data } = await supa.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

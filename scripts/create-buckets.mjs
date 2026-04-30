#!/usr/bin/env node
// Create the Supabase Storage buckets we need. Idempotent.
//   - booking-photos      (public read, writer = washer assigned to booking)
//   - insurance-docs      (private — washer-only + admin)
//   - partner-portfolio   (public read, writer = partner_owner)
//   - claim-evidence      (private — customer + admin)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2];
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const buckets = [
  { id: "booking-photos", public: true, fileSizeLimit: 8 * 1024 * 1024 },
  { id: "insurance-docs", public: false, fileSizeLimit: 12 * 1024 * 1024 },
  { id: "partner-portfolio", public: true, fileSizeLimit: 8 * 1024 * 1024 },
  { id: "claim-evidence", public: false, fileSizeLimit: 12 * 1024 * 1024 },
];

for (const b of buckets) {
  const { data: existing } = await supa.storage.getBucket(b.id);
  if (existing) {
    await supa.storage.updateBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
    });
    console.log(`✓ updated ${b.id} (public=${b.public})`);
  } else {
    const { error } = await supa.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.fileSizeLimit,
    });
    if (error) console.error(`✗ ${b.id}: ${error.message}`);
    else console.log(`✓ created ${b.id} (public=${b.public})`);
  }
}

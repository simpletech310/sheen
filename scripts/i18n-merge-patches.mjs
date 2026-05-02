#!/usr/bin/env node
/**
 * Merge all i18n-patch-*.json staging files (from the parallel-agent
 * localization run) into messages/en.json and messages/es.json.
 *
 * Patches contain `{ en: { namespace: {...} }, es: { namespace: {...} } }`.
 * Existing namespaces in the catalogs are left alone (we only add new
 * top-level keys), so this is safe to re-run.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const MSG = resolve(ROOT, "messages");

const patches = [];

// Project root patches: i18n-patch-1.json through 6.json
for (const f of readdirSync(ROOT)) {
  if (/^i18n-patch-\d+\.json$/.test(f)) {
    patches.push(resolve(ROOT, f));
  }
}
// scripts/ subdir patches (agent 5)
const scriptsDir = resolve(ROOT, "scripts");
for (const f of readdirSync(scriptsDir)) {
  if (/^i18n-patch-\d+\.json$/.test(f)) {
    patches.push(resolve(scriptsDir, f));
  }
}

patches.sort();
console.log("Found patches:", patches.map((p) => p.replace(ROOT + "/", "")));

const en = JSON.parse(readFileSync(resolve(MSG, "en.json"), "utf8"));
const es = JSON.parse(readFileSync(resolve(MSG, "es.json"), "utf8"));

let enAdds = 0;
let esAdds = 0;

for (const p of patches) {
  const patch = JSON.parse(readFileSync(p, "utf8"));
  if (patch.en) {
    for (const [ns, val] of Object.entries(patch.en)) {
      if (!en[ns]) {
        en[ns] = val;
        enAdds++;
        console.log(`  en.${ns} ← ${p.split("/").pop()}`);
      } else {
        console.log(`  en.${ns} already present, skipping`);
      }
    }
  }
  if (patch.es) {
    for (const [ns, val] of Object.entries(patch.es)) {
      if (!es[ns]) {
        es[ns] = val;
        esAdds++;
        console.log(`  es.${ns} ← ${p.split("/").pop()}`);
      } else {
        console.log(`  es.${ns} already present, skipping`);
      }
    }
  }
}

writeFileSync(resolve(MSG, "en.json"), JSON.stringify(en, null, 2) + "\n");
writeFileSync(resolve(MSG, "es.json"), JSON.stringify(es, null, 2) + "\n");

console.log(`\nDone. ${enAdds} new en namespaces, ${esAdds} new es namespaces.`);
console.log(`en namespaces: ${Object.keys(en).length}`);
console.log(`es namespaces: ${Object.keys(es).length}`);

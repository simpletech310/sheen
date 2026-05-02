#!/usr/bin/env node
/**
 * Backfill missing keys across all locale files using en.json as the source
 * of truth. Also adds Spanish translations for the bigRig namespace (the only
 * namespace where es.json is incomplete after the recent agent run).
 *
 * Strategy:
 * 1. Splice the bigRig Spanish dictionary into es.json (overwriting any
 *    English placeholders left behind by the agents).
 * 2. For ko/zh/vi/pt/fr/ru, walk every key in en.json. If the locale has
 *    that key set to a real value, leave it. If missing, copy the English
 *    value as a placeholder so next-intl's default-fallback never throws
 *    a "missing message" error in production.
 *
 * Run with: node scripts/i18n-backfill.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const MSG = path.join(ROOT, "messages");
const en = JSON.parse(fs.readFileSync(path.join(MSG, "en.json"), "utf8"));

// ──────────────────────────────────────────────────────────────────────────
// Spanish translations for bigRig — brand voice (bold, sharp, uppercase
// headlines). Kept literal where the term is industry-standard ("foam
// cannon", "DOT", etc.) so washers searching in Spanish still recognize it.
// ──────────────────────────────────────────────────────────────────────────
const bigRigES = {
  seeTiers: "Ver niveles",
  whyHeadline: "POR QUÉ NOSOTROS.",
  whyEyebrow: "Lo que recibes",
  why1Title: "Vamos a ti",
  why1Desc:
    "Parador, patio, lote, tu entrada — donde tengas estacionado el camión. Sin desvíos, sin cita en taller.",
  why2Title: "Equipo a escala",
  why2Desc:
    "Pros verificados para big-rig antes de reservar: mangueras largas, cañón de espuma, escaleras, bombas de alto caudal. Sin equipos a medias intentando lavar 53 pies.",
  why3Title: "Asegurado para la carga",
  why3Desc:
    "Seguro de responsabilidad civil de $1M en cada pro. Garantía de daños de $2,500 en cada lavado. Reclama desde la app en menos de 24 horas.",
  why4Title: "Listo para DOT",
  why4Desc:
    "Enjuague rápido antes de inspección CSA. O acabado showroom para una feria o venta.",
  tiersHeadline: "CUATRO NIVELES.",
  tiersEyebrow: "Elige tu nivel",
  mostBooked: "Más reservado",
  launchPromo: "Promo de lanzamiento · 90 días",
  bookTier: "Reservar {name} →",
  tier1Name: "Enjuague de Camión",
  tier1Time: "1.5 hr",
  tier1Items: [
    "Lavado con espuma",
    "Enjuague de cabina + remolque",
    "Llantas y guardabarros",
    "Ventanas",
  ],
  tier2Name: "Lavado de Remolque",
  tier2Time: "3 hr",
  tier2Items: [
    "Todo lo del Enjuague",
    "Pulido de cromo",
    "Brillo de llantas",
    "Detalle de guardabarros",
  ],
  tier3Name: "Detalle Completo",
  tier3Time: "5 hr",
  tier3Items: [
    "Todo lo del Remolque",
    "Detalle interior de cabina",
    "Acondicionado de cuero",
    "Aspirado de cabina-dormitorio",
  ],
  tier4Name: "Showroom Camión",
  tier4Time: "8 hr",
  tier4Items: [
    "Todo lo del Detalle Completo",
    "Corrección de pintura",
    "Refuerzo cerámico",
    "Calidad concours",
  ],
  membershipsEyebrow: "SHEEN+ para camiones",
  membershipsHeadlineA: "MEMBRESÍAS QUE",
  membershipsHeadlineB: "SE PAGAN SOLAS.",
  membershipsBody:
    "Hechas para operadores-dueños y flotas pequeñas. Lavados garantizados al mes, ruteo prioritario, 100% en puntos de lealtad.",
  membershipsSubscribe: "Suscribirse →",
  membershipsPopular: "Popular",
  chooseMembership: "Elegir {name} →",
  m1Name: "Camión Solo",
  m1Price: "$199/mes",
  m1Desc: "1 Lavado de Remolque al mes — para operadores-dueños.",
  m1Fits: ["1 lavado / mes", "Hasta nivel Lavado de Remolque", "Prioridad mismo día"],
  m2Name: "Camión Pro",
  m2Price: "$349/mes",
  m2Desc: "2 lavados de big-rig hasta Detalle Completo. Para los que la rompen.",
  m2Fits: ["2 lavados / mes", "Hasta Detalle Completo", "Cola prioritaria"],
  m3Name: "Sheen+ Combinado",
  m3Price: "$199/mes",
  m3Desc: "1 Detalle Premium de auto + 1 Lavado de Remolque. Para profesionales con dos vehículos.",
  m3Fits: [
    "Cobertura auto + camión",
    "Hasta Premium auto / Remolque rig",
    "Misma prioridad",
  ],
  faqHeadline: "PREGUNTAS.",
  faqEyebrow: "FAQ",
  faq1Q: "¿Pueden lavar en un parador?",
  faq1A:
    "Sí. Marca el lugar, el pro confirma el espacio y el acceso, y llega con su propia agua y energía.",
  faq2Q: "¿Y si el remolque está cargado?",
  faq2A:
    "El lavado exterior funciona igual. Para Detalle Completo del interior limpiamos la cabina mientras la caja queda sellada.",
  faq3Q: "¿Reefer / cisterna / plataforma — todos?",
  faq3A:
    "Todos. Los pros marcan los tipos de camión que manejan al unirse a la cola big-rig. Solo enviamos lo que pueden manejar.",
  faq4Q: "¿Cuánto toma un Showroom Camión?",
  faq4A:
    "Calcula 8 horas completas. La corrección de pintura en un camión de 70 pies no es trabajo rápido. No recortamos el tiempo.",
  closingHeadlineA: "RESERVA TU",
  closingHeadlineB: "CAMIÓN.",
  closingSubhead:
    "Ventanas mismo día en LA. Pros asegurados. 100% de las propinas para tu conductor.",
  closingSeePlans: "Ver planes",
};

const esPath = path.join(MSG, "es.json");
const es = JSON.parse(fs.readFileSync(esPath, "utf8"));
es.bigRig = { ...es.bigRig, ...bigRigES };
fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + "\n");
console.log(`✅ es.json — bigRig namespace updated (${Object.keys(bigRigES).length} keys)`);

// ──────────────────────────────────────────────────────────────────────────
// Backfill ko/zh/vi/pt/fr/ru with English placeholders for any keys missing.
// next-intl throws on missing messages by default; even an English string is
// preferable to a runtime error. Real translations get layered in later.
// ──────────────────────────────────────────────────────────────────────────
const otherLocales = ["ko", "zh", "vi", "pt", "fr", "ru"];

function deepMerge(target, source) {
  // For every key in source, if target lacks it, copy the source value.
  // For nested objects, recurse so we add only the missing leaves.
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (sv !== null && typeof sv === "object" && !Array.isArray(sv)) {
      if (!target[k] || typeof target[k] !== "object" || Array.isArray(target[k])) {
        target[k] = {};
      }
      deepMerge(target[k], sv);
    } else if (!(k in target)) {
      target[k] = sv;
    }
  }
}

for (const loc of otherLocales) {
  const p = path.join(MSG, `${loc}.json`);
  const cur = JSON.parse(fs.readFileSync(p, "utf8"));
  const before = JSON.stringify(cur).length;
  deepMerge(cur, en);
  const after = JSON.stringify(cur).length;
  fs.writeFileSync(p, JSON.stringify(cur, null, 2) + "\n");
  console.log(`✅ ${loc}.json — backfilled (+${after - before} chars)`);
}

console.log("\nDone. Run `git diff messages/` to review.");

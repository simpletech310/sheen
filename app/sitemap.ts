import type { MetadataRoute } from "next";
import { CITY_SLUGS } from "@/lib/cities";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://sheen.la";

// Sitemap fed to search engines via /sitemap.xml. Lists every public
// marketing/landing route — dashboard + auth surfaces are excluded so
// they don't dilute the index.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`,            lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${SITE}/auto`,        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE}/home`,        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE}/big-rig`,     lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE}/business`,    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/wash`,        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE}/partner`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/safety`,      lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/help`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/sign-in`,     lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${SITE}/sign-up`,     lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${SITE}/legal/tos`,             lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE}/legal/privacy`,         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE}/legal/washer-agreement`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  for (const slug of CITY_SLUGS) {
    routes.push({
      url: `${SITE}/cities/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }
  return routes;
}

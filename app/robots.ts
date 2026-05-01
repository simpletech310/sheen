import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://sheen.la";

// Marketing surface is wide-open. Customer + washer apps, auth callback,
// admin, and API routes are explicitly disallowed so they don't get
// crawled (and don't compete with marketing pages for ranking).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/app/",      // signed-in customer app
          "/pro/",      // signed-in washer app
          "/partner/",  // signed-in partner app (apply page is fine for nav, just not the dashboards)
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

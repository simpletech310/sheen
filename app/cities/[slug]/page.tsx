import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CITIES, CITY_SLUGS, type CityMarket } from "@/lib/cities";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://sheen.la";

export function generateStaticParams() {
  return CITY_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = CITIES[params.slug];
  if (!c) return { title: "Sheen" };
  const title = `Mobile car wash & detail in ${c.name} — Sheen`;
  const description = c.shortCopy;
  const url = `${SITE}/cities/${c.slug}`;
  const ogImage = `${SITE}${c.hero}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Sheen",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${c.name} mobile detailing` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// Build the LocalBusiness + FAQPage JSON-LD per city — Google reads this for
// rich-result eligibility and local-pack ranking.
function jsonLd(c: CityMarket) {
  const local = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE}/cities/${c.slug}#business`,
    name: `Sheen — ${c.name}`,
    image: `${SITE}${c.hero}`,
    url: `${SITE}/cities/${c.slug}`,
    priceRange: "$$",
    areaServed: c.zips.map((z) => ({
      "@type": "PostalAddress",
      postalCode: z,
      addressRegion: c.state,
      addressCountry: "US",
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: c.name,
      addressRegion: c.state,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: c.geo.lat, longitude: c.geo.lng },
    serviceType: c.popular.map((p) => p.name),
    sameAs: [SITE],
  };
  const faq = c.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: c.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;
  return faq ? [local, faq] : [local];
}

export default function CityPage({ params }: { params: { slug: string } }) {
  const c = CITIES[params.slug];
  if (!c) notFound();
  const ld = jsonLd(c);

  return (
    <>
      {ld.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <MNav />

      {/* Hero — featured per-city image with brand overlay. */}
      <section className="relative overflow-hidden bg-ink text-bone">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.hero} alt={`${c.name} mobile detailing`} className="w-full h-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-br from-royal/85 via-ink/80 to-ink" />
        </div>
        <div className="relative z-10 px-6 md:px-14 pt-16 md:pt-20 pb-14">
          <Eyebrow className="!text-sol">
            {c.region} · {c.state}
          </Eyebrow>
          <h1 className="display text-[52px] md:text-[96px] leading-[0.95] mt-6 max-w-[900px]">
            MOBILE WASH
            <br />
            IN <span className="text-sol">{c.name.toUpperCase()}.</span>
          </h1>
          <p className="mt-6 text-lg max-w-[640px] text-bone/85 leading-relaxed">{c.pitch}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/book/auto"
              className="bg-sol text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone transition"
            >
              Book in 60 seconds →
            </Link>
            <Link
              href="/wash"
              className="border border-bone text-bone px-7 py-4 text-sm font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
            >
              Become a pro
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-[480px]">
            <div className="border-l-2 border-sol pl-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">Insured</div>
              <div className="display tabular text-base text-bone mt-1">$1M GL</div>
            </div>
            <div className="border-l-2 border-sol pl-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">Damage cover</div>
              <div className="display tabular text-base text-bone mt-1">$2,500</div>
            </div>
            <div className="border-l-2 border-sol pl-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60">Tips</div>
              <div className="display tabular text-base text-bone mt-1">100%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-bone">
        <div className="flex justify-between items-end mb-8">
          <h2 className="display text-[36px] md:text-[56px] leading-none">POPULAR HERE.</h2>
          <Eyebrow>{c.name} picks</Eyebrow>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {c.popular.map((s, i) => (
            <Link
              key={s.name}
              href={s.href}
              className={`block p-5 transition border-l-2 ${
                i === 0
                  ? "bg-royal text-bone border-sol hover:bg-ink"
                  : "bg-mist/30 text-ink border-royal hover:bg-mist/60"
              }`}
            >
              <div className={`font-mono text-[10px] uppercase tracking-wider ${i === 0 ? "text-sol" : "text-royal"}`}>
                Tier {i + 1}
              </div>
              <div className="display text-xl mt-2 leading-tight">{s.name.toUpperCase()}</div>
              <div className={`display tabular text-2xl mt-3 ${i === 0 ? "text-sol" : "text-royal"}`}>
                from {s.from}
              </div>
              <div className={`text-[11px] mt-1 ${i === 0 ? "text-bone/70" : "text-smoke"}`}>
                Promo · 90-day launch
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-14 py-16 bg-mist/40">
        <div className="flex justify-between items-end mb-8">
          <h2 className="display text-[36px] md:text-[56px] leading-none">
            WE COVER
            <br />
            <span className="text-royal">{c.name.toUpperCase()}.</span>
          </h2>
          <Eyebrow>Neighborhoods</Eyebrow>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {c.neighborhoods.map((n) => (
            <span
              key={n}
              className="inline-block bg-bone border border-mist px-3 py-1.5 text-xs text-ink"
            >
              {n}
            </span>
          ))}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          ZIP codes
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.zips.map((z) => (
            <span
              key={z}
              className="font-mono text-[11px] tabular bg-bone border border-mist px-2 py-1 text-smoke"
            >
              {z}
            </span>
          ))}
        </div>
      </section>

      {c.faq.length > 0 && (
        <section className="px-6 md:px-14 py-16 bg-bone">
          <div className="flex justify-between items-end mb-8">
            <h2 className="display text-[36px] md:text-[56px] leading-none">QUESTIONS.</h2>
            <Eyebrow>{c.name}</Eyebrow>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.faq.map((f) => (
              <details key={f.q} className="bg-mist/30 border border-mist p-5 group">
                <summary className="display text-xl cursor-pointer flex justify-between items-center">
                  <span>{f.q}</span>
                  <span className="text-royal ml-3 group-open:rotate-45 transition">+</span>
                </summary>
                <p className="text-sm text-ink/80 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="bg-royal text-bone px-6 md:px-14 py-20 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
        <h2 className="display text-[44px] md:text-[72px] leading-tight">
          BOOK A WASH IN <span className="text-sol">{c.name.toUpperCase()}.</span>
        </h2>
        <p className="mt-4 max-w-md mx-auto opacity-80 text-sm">
          60-second booking · same-day windows · launch promo pricing through the first 90 days.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/app/book/auto"
            className="inline-block bg-sol text-ink px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone transition"
          >
            Book auto wash →
          </Link>
          <Link
            href="/app/book/home"
            className="inline-block border border-bone text-bone px-9 py-5 text-base font-bold uppercase tracking-wide hover:bg-bone hover:text-ink transition"
          >
            Book home wash
          </Link>
        </div>
      </section>

      <MFooter />
    </>
  );
}

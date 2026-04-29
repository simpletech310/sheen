import { notFound } from "next/navigation";
import Link from "next/link";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

const cities: Record<string, { name: string; copy: string }> = {
  compton: { name: "Compton", copy: "Mobile car detailing in Compton, CA. Express to showroom-grade. Vetted local pros, $2,500 damage guarantee." },
  "south-bay": { name: "South Bay", copy: "Auto detail and home power-wash from Manhattan Beach to Long Beach. Same-day windows, transparent pricing." },
  "los-angeles": { name: "Los Angeles", copy: "On-demand wash & detail across LA. Book in 60 seconds." },
};

export function generateStaticParams() {
  return Object.keys(cities).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = cities[params.slug];
  return c ? { title: `Mobile car detailing in ${c.name} — Sheen` } : { title: "Sheen" };
}

export default function CityPage({ params }: { params: { slug: string } }) {
  const c = cities[params.slug];
  if (!c) notFound();
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-16">
        <Eyebrow>Cities · {c.name}</Eyebrow>
        <h1 className="display text-[48px] md:text-[88px] leading-[0.95] mt-6 max-w-[900px]">
          Mobile detailing in {c.name}.
        </h1>
        <p className="mt-6 text-lg max-w-[600px] text-smoke">{c.copy}</p>
        <Link href="/app/book" className="mt-8 inline-block bg-ink text-bone rounded-full px-7 py-4 text-sm font-semibold">
          Book in 60 seconds →
        </Link>
      </section>
      <MFooter />
    </>
  );
}

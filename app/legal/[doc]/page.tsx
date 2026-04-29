import { notFound } from "next/navigation";
import { MNav } from "@/components/marketing/MNav";
import { MFooter } from "@/components/marketing/MFooter";
import { Eyebrow } from "@/components/brand/Eyebrow";

const docs: Record<string, { title: string; body: string }> = {
  tos: {
    title: "Terms of Service",
    body: "These terms govern your use of Sheen. By using the platform you agree to these terms in full. (Placeholder content — replace with finalized ToS before launch.)",
  },
  privacy: {
    title: "Privacy Policy",
    body: "We collect the minimum necessary to deliver service. We never sell your data. (Placeholder — replace with finalized policy before launch.)",
  },
  "washer-agreement": {
    title: "Washer Agreement",
    body: "By accepting jobs as a Sheen washer you operate as an independent contractor and agree to our service standards, $1M GL minimum, and damage policy. (Placeholder — replace with finalized agreement before launch.)",
  },
};

export function generateStaticParams() {
  return Object.keys(docs).map((doc) => ({ doc }));
}

export default function LegalPage({ params }: { params: { doc: string } }) {
  const d = docs[params.doc];
  if (!d) notFound();
  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-16 max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="display text-[48px] md:text-[64px] leading-tight mt-6 mb-8">{d.title}</h1>
        <p className="text-base text-smoke leading-relaxed">{d.body}</p>
      </section>
      <MFooter />
    </>
  );
}

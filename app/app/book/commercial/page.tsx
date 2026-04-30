import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { CommercialLeadForm } from "./CommercialLeadForm";

export const dynamic = "force-dynamic";

export default function CommercialLeadPage() {
  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>Commercial · Quoted</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Tell us about the job</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-sm text-smoke mb-6 leading-relaxed">
        Storefronts, fleet washes, post-construction cleanups. We&rsquo;ll quote
        within 24 hours. For ongoing routes we offer per-visit, weekly, or
        monthly rates.
      </p>

      <CommercialLeadForm />
    </div>
  );
}

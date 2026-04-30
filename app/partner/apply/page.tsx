"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MNav } from "@/components/marketing/MNav";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { DocUpload } from "@/components/partner/DocUpload";
import { toast } from "@/components/ui/Toast";

const types = ["Auto detail", "Mobile fleet", "Power wash", "Multi-service"];
const yearsOptions = ["<1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState(types[0]);
  const [years, setYears] = useState(yearsOptions[2]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [glPath, setGlPath] = useState<string | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allCapabilities = [
    "Ceramic coating",
    "Paint correction",
    "Soft wash",
    "Pressure wash",
    "Interior detail",
    "Pet hair",
    "Solar panels",
    "Fleet washing",
  ];

  function toggleCap(c: string) {
    setCapabilities((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  }

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: name,
          type,
          years,
          capabilities,
          gl_doc_path: glPath,
          license_doc_path: licensePath,
          portfolio_photos: portfolio,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Status ${res.status}`);
      }
      toast("Application submitted — we’ll review within 48 hours", "success");
      router.push("/partner/dashboard");
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || "Could not submit", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <MNav />
      <section className="px-6 md:px-14 py-12 max-w-2xl">
        <Eyebrow>Apply · Step {step} / 4</Eyebrow>
        <h1 className="display text-[40px] md:text-[56px] leading-tight mt-4 mb-8">
          {step === 1 && "Tell us about your business."}
          {step === 2 && "Capabilities."}
          {step === 3 && "Documents."}
          {step === 4 && "Review."}
        </h1>

        <div className="bg-mist h-1 mb-10">
          <div className="bg-cobalt h-1 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Business name"
              className="w-full px-4 py-3.5 bg-bone border border-mist rounded-md text-sm"
            />
            <div>
              <Eyebrow>Type</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`p-3 text-sm ${type === t ? "bg-ink text-bone" : "bg-mist/50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Eyebrow>Years in business</Eyebrow>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                {yearsOptions.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`p-3 text-xs ${years === y ? "bg-ink text-bone" : "bg-mist/50"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {years === "10+ years" && (
                <div className="mt-3 text-xs text-wax font-mono uppercase">★ Founding-partner eligible</div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <Eyebrow>Capabilities (multi-select)</Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {allCapabilities.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCap(c)}
                  className={`p-3 text-sm ${capabilities.includes(c) ? "bg-ink text-bone" : "bg-mist/50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <DocUpload
              bucket="insurance-docs"
              scope="partner-gl"
              accept="application/pdf,image/*"
              label="$1M GL Insurance"
              hint="Upload PDF or photo · current effective date"
              onChange={(p) => setGlPath(p[0] ?? null)}
              initialPaths={glPath ? [glPath] : []}
            />
            <DocUpload
              bucket="insurance-docs"
              scope="partner-license"
              accept="application/pdf,image/*"
              label="Business license"
              hint="State or city operating license"
              onChange={(p) => setLicensePath(p[0] ?? null)}
              initialPaths={licensePath ? [licensePath] : []}
            />
            <DocUpload
              bucket="partner-portfolio"
              scope="partner-portfolio"
              accept="image/*"
              multiple
              label="3+ sample jobs"
              hint="Photos of your best work"
              onChange={setPortfolio}
              initialPaths={portfolio}
            />
          </div>
        )}

        {step === 4 && (
          <div className="bg-mist/40 p-5 text-sm space-y-3">
            <div>
              <strong>Business:</strong> {name || "—"}
            </div>
            <div>
              <strong>Type:</strong> {type}
            </div>
            <div>
              <strong>Years:</strong> {years}
            </div>
            <div>
              <strong>Capabilities:</strong> {capabilities.join(", ") || "—"}
            </div>
            <div>
              <strong>Documents:</strong>{" "}
              {[
                glPath && "GL insurance",
                licensePath && "License",
                portfolio.length > 0 && `${portfolio.length} portfolio photos`,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </div>
            <p className="text-xs text-smoke pt-3 border-t border-mist">
              We&rsquo;ll review within 48 hours and email you with next steps.
            </p>
          </div>
        )}

        {err && <div className="text-sm text-bad mt-4">{err}</div>}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="bg-mist text-ink rounded-full px-6 py-3 text-sm font-semibold"
            >
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !name}
              className="bg-cobalt text-bone rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="bg-cobalt text-bone rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit application →"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}

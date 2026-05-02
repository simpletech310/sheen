"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

export function ClaimButton({ jobId }: { jobId: string }) {
  const t = useTranslations("proQueue");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bookings/${jobId}/claim`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Status ${res.status}`);
      }
      toast(t("claimSuccess"), "success");
      router.push(`/pro/jobs/${jobId}/navigate`);
    } catch (e: any) {
      setErr(e.message);
      toast(e.message || t("claimError"), "error");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={claim}
        disabled={loading}
        className="w-full bg-cobalt text-bone rounded-full py-4 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? t("claiming") : t("claimJob")}
      </button>
      {err && <div className="text-sm text-bad mt-3 text-center">{err}</div>}
    </>
  );
}

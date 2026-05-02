"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";
import { StripePaymentElement } from "@/components/customer/StripePaymentElement";
import { fmtUSD } from "@/lib/pricing";
import { useTranslations } from "next-intl";

const tips = [
  { pct: 18, label: "18%" },
  { pct: 22, label: "22%" },
  { pct: 25, label: "25%" },
];

// Server-side allowlist (see /api/stripe/checkout-tip:20). Mirror it here
// so we can show the user *before* they hit Pay why the button is locked.
const TIPPABLE_STATUSES = new Set(["completed", "funded"]);

function RateInner({ params }: { params: { id: string } }) {
  const t = useTranslations("appRate");
  const { id } = params;
  const router = useRouter();
  const [stars, setStars] = useState(5);
  const [tipPct, setTipPct] = useState(22);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [preparingTip, setPreparingTip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const tipCents = booking ? Math.round((booking.service_cents * tipPct) / 100) : 0;
  const tipAllowed = !!booking && TIPPABLE_STATUSES.has(booking.status);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Not found")))
      .then(d => {
        // Endpoint now returns { booking, vehicles, checklist, photos };
        // tolerate the older flat shape just in case it's cached.
        setBooking(d?.booking ?? d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Create the tip PaymentIntent on demand — when the user opens the modal,
  // not on every tip-percent change. Surfaces the API error via toast +
  // closes the modal instead of stranding the user on the spinner.
  async function preparePayment() {
    if (tipCents <= 0) return;
    setPreparingTip(true);
    setClientSecret(null);
    try {
      const r = await fetch("/api/stripe/checkout-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, amount_cents: tipCents }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.client_secret) {
        throw new Error(d?.error || t("tipPrepareError"));
      }
      setClientSecret(d.client_secret);
    } catch (e: any) {
      toast(e.message || t("tipPrepareError"), "error");
      setShowPayModal(false);
    } finally {
      setPreparingTip(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const sig = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "booking-photos", scope: `review_${id}`, ext }),
      });
      const sigData = await sig.json();
      if (!sig.ok) throw new Error(sigData.error || t("uploadSetupError"));
      const put = await fetch(sigData.signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(t("uploadError"));
      setPhotoPath(sigData.path);
      toast(t("photoAdded"), "success");
    } catch (e: any) {
      toast(e.message || t("uploadError"), "error");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/bookings/${id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, tip_pct: tipPct, comment, photo_path: photoPath ?? undefined }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || t("submitError"));
      }
      toast(
        tipPct > 0 ? t("submitSuccessWithTip") : t("submitSuccess"),
        "success"
      );
      router.push("/app/washes");
    } catch (e: any) {
      toast(e.message || t("submitError"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-smoke">{t("loading")}</div>;
  if (!booking) return <div className="p-10 text-center text-bad">{t("notFound")}</div>;

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/app/tracking/${id}`} className="text-smoke text-sm">
          ← {t("back")}
        </Link>
      </div>
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-6">{t("headline")}</h1>

      <div className="flex gap-2 mb-7">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-4xl ${n <= stars ? "text-cobalt" : "text-mist"}`}
            aria-label={t("starAriaLabel", { n })}
          >
            ★
          </button>
        ))}
      </div>

      <Eyebrow>{t("addTipEyebrow")}</Eyebrow>
      <div className="grid grid-cols-4 gap-2 mt-3 mb-6">
        {tips.map((tip) => (
          <button
            key={tip.pct}
            onClick={() => setTipPct(tip.pct)}
            className={`p-3 text-sm font-bold uppercase tracking-wide ${tipPct === tip.pct ? "bg-ink text-bone" : "bg-mist/50"}`}
          >
            {tip.label}
          </button>
        ))}
        <button onClick={() => setTipPct(0)} className={`p-3 text-sm font-bold uppercase tracking-wide ${tipPct === 0 ? "bg-ink text-bone" : "bg-mist/50"}`}>
          {t("skipTip")}
        </button>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentPlaceholder")}
        rows={3}
        className="w-full px-4 py-3 bg-bone border border-mist rounded-none text-sm mb-3"
      />

      {/* Photo with review unlocks the Sheen Star achievement at 25 photo
          reviews. Optional — skip for the speedy path. */}
      <div className="mb-6">
        {photoPath ? (
          <div className="flex items-center gap-3 bg-mist/40 px-3 py-2 text-xs">
            <div className="w-8 h-8 bg-good/20 flex items-center justify-center text-good">✓</div>
            <div className="flex-1 text-smoke">{t("photoOnReview")}</div>
            <button
              type="button"
              onClick={() => setPhotoPath(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-bad hover:text-ink"
            >
              {t("removePhoto")}
            </button>
          </div>
        ) : (
          <label className={`block w-full text-center py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition border border-dashed ${uploadingPhoto ? "bg-mist text-smoke border-mist" : "bg-bone text-ink border-smoke hover:bg-mist/40"}`}>
            {uploadingPhoto ? t("uploading") : t("addPhoto")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={uploadingPhoto}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {tipPct === 0 ? (
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-cobalt text-bone rounded-none py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? t("submitting") : t("submitRating")}
        </button>
      ) : tipAllowed ? (
        <button
          onClick={() => {
            setShowPayModal(true);
            preparePayment();
          }}
          disabled={submitting || preparingTip}
          className="w-full bg-cobalt text-bone rounded-none py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {preparingTip ? t("preparing") : t("submitAndPay", { amount: fmtUSD(tipCents) })}
        </button>
      ) : (
        <div>
          <div className="bg-mist/40 border-l-2 border-sol p-3 text-xs text-smoke leading-relaxed">
            {t("tipLockedNote")}
          </div>
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-3 w-full bg-mist text-ink rounded-none py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
          >
            {submitting ? t("submitting") : t("submitWithoutTip")}
          </button>
        </div>
      )}

      {/* Tip Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm">
          <div className="bg-bone w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Eyebrow>{t("secureTipEyebrow")}</Eyebrow>
                <h2 className="display text-2xl">{t("payTipTitle")}</h2>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-smoke hover:text-ink transition p-2"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 text-sm text-smoke">
              {t("tipGoesToPro", { amount: fmtUSD(tipCents) })}
            </div>

            {clientSecret ? (
              <StripePaymentElement
                clientSecret={clientSecret}
                amountLabel={fmtUSD(tipCents)}
                onSuccess={() => {
                  setShowPayModal(false);
                  submit();
                }}
              />
            ) : (
              <div className="py-12 text-center text-sm text-smoke">
                {t("preparingPayment")}
              </div>
            )}

            <p className="text-[10px] text-smoke text-center mt-6 uppercase tracking-wider">
              {t("stripeNote")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RatePage({ params }: { params: { id: string } }) {
  return (
    <Suspense>
      <RateInner params={params} />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { computeFees } from "@/lib/stripe/fees";
import { fmtUSD } from "@/lib/pricing";
import { StripePaymentElement } from "@/components/customer/StripePaymentElement";
import { readDraft, clearDraft } from "@/lib/booking-draft";

function PayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = params.get("tier") ?? "Premium Detail";
  const basePrice = Number(params.get("price") ?? "18500");
  const count = Math.max(1, Number(params.get("count") ?? "1"));
  const category = params.get("category") === "home" ? "home" : "auto";
  // Auto multiplies by vehicle count. Home has its multiplier baked
  // into `price` already (e.g. solar panels × N).
  const totalServiceCents = category === "home" ? basePrice : basePrice * count;
  const fees = computeFees({ serviceCents: totalServiceCents, routedTo: "solo_washer" });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(Number(params.get("redeem") ?? "0"));

  const street = params.get("street") ?? "";
  const unit = params.get("unit") ?? "";
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "CA";
  const zip = params.get("zip") ?? "";
  const lat = params.get("lat");
  const lng = params.get("lng");
  const notes = params.get("notes") ?? "";
  const win = params.get("window") ?? "tomorrow_10_12";
  const requestedHandle = params.get("handle") ?? "";

  useEffect(() => {
    if (!street || !zip) {
      setErr("Missing address — go back and pick one.");
      setLoading(false);
      return;
    }
    // Auto bookings carry vehicles in the draft; home bookings don't.
    const draft = readDraft();
    if (category === "auto" && (!draft || draft.vehicleIds.length === 0)) {
      setErr("No vehicles selected — go back and pick at least one.");
      setLoading(false);
      return;
    }
    // Best-effort load of loyalty balance for the redemption slider.
    fetch("/api/loyalty/balance")
      .then((r) => r.json())
      .then((d) => setPointsBalance(d.points ?? 0))
      .catch(() => {});

    (async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier_name: tier,
            category,
            service_cents: totalServiceCents,
            vehicle_ids: category === "auto" ? draft?.vehicleIds : undefined,
            condition_photos: category === "auto" ? draft?.conditionPhotos : undefined,
            requested_wash_handle: requestedHandle || undefined,
            redeem_points: redeemPoints || undefined,
            address: {
              street,
              unit,
              city,
              state,
              zip,
              lat: lat ? Number(lat) : undefined,
              lng: lng ? Number(lng) : undefined,
              notes,
            },
            window: win,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Status ${res.status}`);
        }
        const data = await res.json();
        if (data.covered_by_membership || data.covered_by_loyalty) {
          clearDraft();
          router.replace(`/app/tracking/${data.booking_id}`);
          return;
        }
        setClientSecret(data.client_secret);
        setBookingId(data.booking_id);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPaymentSuccess() {
    clearDraft();
    router.push(`/app/tracking/${bookingId}`);
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/book/address" className="text-smoke text-sm">
          ← Back
        </Link>
      </div>
      <Eyebrow>
        Step {category === "home" ? "3 / 3" : "4 / 4"} · Pay &amp; confirm
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Confirm &amp; pay</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />

      <div className="bg-mist/40 p-5 mb-5">
        <div className="text-sm font-bold">{tier}</div>
        <div className="text-xs text-smoke">
          {street}
          {unit ? ` ${unit}` : ""}, {city}, {state} {zip}
        </div>
        <div className="text-xs text-smoke mt-1">{win.replace(/_/g, " ")}</div>
        {category === "auto" && (
          <div className="text-xs text-smoke mt-1">
            {count} vehicle{count === 1 ? "" : "s"}
          </div>
        )}
        {requestedHandle && (
          <div className="text-xs mt-2 font-mono uppercase tracking-wider text-royal">
            Requesting pro · {requestedHandle}
          </div>
        )}
      </div>

      {pointsBalance > 0 && !clientSecret && !loading && (
        <div className="bg-royal text-bone p-4 mb-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                Redeem loyalty
              </div>
              <div className="text-sm mt-1">
                {pointsBalance.toLocaleString()} pts available · 100 pts = $1
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const max = Math.min(pointsBalance, fees.serviceCents);
                setRedeemPoints(redeemPoints > 0 ? 0 : Math.floor(max / 100) * 100);
              }}
              className="bg-sol text-ink px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-bone"
            >
              {redeemPoints > 0 ? "Clear" : "Apply max"}
            </button>
          </div>
          {redeemPoints > 0 && (
            <>
              <div className="mt-3">
                <input
                  type="range"
                  min={0}
                  max={Math.min(pointsBalance, fees.serviceCents)}
                  step={100}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full accent-sol"
                />
                <div className="flex justify-between text-xs mt-1 opacity-90 tabular">
                  <span>{redeemPoints.toLocaleString()} pts</span>
                  <span>− {fmtUSD(redeemPoints)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("redeem", String(redeemPoints));
                  window.location.href = url.pathname + url.search;
                }}
                className="mt-3 w-full bg-ink text-bone py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-bone hover:text-ink"
              >
                Apply &amp; refresh checkout
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-2.5 text-sm mb-5">
        <div className="flex justify-between">
          <span className="text-smoke">
            {tier} {count > 1 ? `× ${count}` : ""}
          </span>
          <span className="tabular">{fmtUSD(fees.serviceCents)}</span>
        </div>
        {count > 1 && (
          <div className="flex justify-between text-xs text-smoke pl-2">
            <span>{fmtUSD(basePrice)} per vehicle</span>
            <span />
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-smoke">Trust fee (10%)</span>
          <span className="tabular">{fmtUSD(fees.trustFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-smoke">
          <span>Tip — added after wash</span>
          <span>—</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-mist">
          <span className="font-bold">Total today</span>
          <span className="display tabular text-2xl">{fmtUSD(fees.customerCharge)}</span>
        </div>
      </div>

      {loading && (
        <div className="bg-mist/40 p-6 text-center text-sm text-smoke">Setting up secure payment…</div>
      )}
      {err && <div className="text-sm text-bad mb-4">{err}</div>}

      {clientSecret && bookingId && (
        <StripePaymentElement
          clientSecret={clientSecret}
          amountLabel={fmtUSD(fees.customerCharge)}
          onSuccess={onPaymentSuccess}
        />
      )}

      <p className="text-[11px] text-smoke text-center mt-4">$2,500 damage guarantee · vetted local pros</p>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense>
      <PayInner />
    </Suspense>
  );
}

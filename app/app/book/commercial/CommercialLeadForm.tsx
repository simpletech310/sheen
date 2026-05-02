"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

// Values sent to the API — keep in English regardless of locale.
const SERVICE_TYPE_VALUES = [
  "Storefront sidewalk",
  "Fleet wash",
  "Post-construction cleanup",
  "Parking lot",
  "Building exterior",
  "Other",
];

const FREQUENCY_VALUES = ["One-time", "Weekly", "Bi-weekly", "Monthly", "Quarterly"];

export function CommercialLeadForm() {
  const router = useRouter();
  const t = useTranslations("appBook");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPE_VALUES[0]);
  const [squareFootage, setSquareFootage] = useState("");
  const [frequency, setFrequency] = useState(FREQUENCY_VALUES[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Translated labels paired to each API value
  const SERVICE_TYPE_LABELS: Record<string, string> = {
    "Storefront sidewalk": t("svcStorefront"),
    "Fleet wash": t("svcFleet"),
    "Post-construction cleanup": t("svcPostConstruction"),
    "Parking lot": t("svcParkingLot"),
    "Building exterior": t("svcBuildingExterior"),
    "Other": t("svcOther"),
  };

  const FREQUENCY_LABELS: Record<string, string> = {
    "One-time": t("freqOneTime"),
    "Weekly": t("freqWeekly"),
    "Bi-weekly": t("freqBiWeekly"),
    "Monthly": t("freqMonthly"),
    "Quarterly": t("freqQuarterly"),
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/leads/commercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          contact_name: contactName || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          service_type: serviceType,
          square_footage: squareFootage ? Number(squareFootage) : null,
          frequency,
          notes: notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("commercialSubmitError"));
      toast(t("commercialSuccessToast"), "success");
      router.push("/app");
    } catch (e: any) {
      toast(e.message || t("commercialSubmitError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder={t("placeholderBusinessName")}
        required
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={t("placeholderContactName")}
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("placeholderPhone")}
          inputMode="tel"
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder={t("placeholderEmail")}
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={t("placeholderServiceAddress")}
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("placeholderCity")}
          className="col-span-2 px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          placeholder={t("placeholderState")}
          maxLength={2}
          className="px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder={t("placeholderZip")}
        inputMode="numeric"
        maxLength={5}
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
      />

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          {t("labelServiceType")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TYPE_VALUES.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setServiceType(val)}
              className={`p-3 text-xs font-medium ${
                serviceType === val ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist"
              }`}
            >
              {SERVICE_TYPE_LABELS[val]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          {t("labelFrequency")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCY_VALUES.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setFrequency(val)}
              className={`p-3 text-xs font-medium ${
                frequency === val ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist"
              }`}
            >
              {FREQUENCY_LABELS[val]}
            </button>
          ))}
        </div>
      </div>

      <input
        value={squareFootage}
        onChange={(e) => setSquareFootage(e.target.value)}
        placeholder={t("placeholderSquareFootage")}
        inputMode="numeric"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("placeholderCommercialNotes")}
        rows={4}
        maxLength={2000}
        className="w-full px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <button
        type="submit"
        disabled={busy || !businessName}
        className="w-full bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
      >
        {busy ? t("commercialSending") : t("commercialRequestQuote")}
      </button>
    </form>
  );
}

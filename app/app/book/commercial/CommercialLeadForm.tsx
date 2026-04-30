"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const SERVICE_TYPES = [
  "Storefront sidewalk",
  "Fleet wash",
  "Post-construction cleanup",
  "Parking lot",
  "Building exterior",
  "Other",
];

const FREQUENCIES = ["One-time", "Weekly", "Bi-weekly", "Monthly", "Quarterly"];

export function CommercialLeadForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [squareFootage, setSquareFootage] = useState("");
  const [frequency, setFrequency] = useState(FREQUENCIES[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

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
      if (!r.ok) throw new Error(d.error || "Could not submit");
      toast("Thanks — we'll quote within 24 hours", "success");
      router.push("/app");
    } catch (e: any) {
      toast(e.message || "Could not submit", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Business name *"
        required
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contact name"
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          inputMode="tel"
          className="px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Service address"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="col-span-2 px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          placeholder="State"
          maxLength={2}
          className="px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
        />
      </div>
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="ZIP"
        inputMode="numeric"
        maxLength={5}
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm font-mono focus:outline-none focus:border-royal"
      />

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Service type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setServiceType(t)}
              className={`p-3 text-xs font-medium ${
                serviceType === t ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
          Frequency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`p-3 text-xs font-medium ${
                frequency === f ? "bg-ink text-bone" : "bg-mist/50 hover:bg-mist"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <input
        value={squareFootage}
        onChange={(e) => setSquareFootage(e.target.value)}
        placeholder="Approx. square footage (optional)"
        inputMode="numeric"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything else we should know? (vehicle count, access constraints, timeline)"
        rows={4}
        maxLength={2000}
        className="w-full px-4 py-3 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />

      <button
        type="submit"
        disabled={busy || !businessName}
        className="w-full bg-ink text-bone py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
      >
        {busy ? "Sending…" : "Request a quote →"}
      </button>
    </form>
  );
}

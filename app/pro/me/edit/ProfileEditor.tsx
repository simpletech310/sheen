"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/customer/AddressAutocomplete";
import { AvatarUpload } from "@/components/customer/AvatarUpload";
import { ServiceRadiusMap } from "@/components/pro/ServiceRadiusMap";
import { toast } from "@/components/ui/Toast";

type Initial = {
  full_name: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  service_radius_miles: number;
  base_lat: number | null;
  base_lng: number | null;
  has_own_water: boolean;
  has_own_power: boolean;
  has_pressure_washer: boolean;
  can_detail_interior: boolean;
  can_do_paint_correction: boolean;
};

const equipmentOpts: {
  key:
    | "has_own_water"
    | "has_own_power"
    | "has_pressure_washer"
    | "can_detail_interior"
    | "can_do_paint_correction";
  label: string;
  hint: string;
}[] = [
  { key: "has_own_water", label: "I bring my own water", hint: "Tank or buffer reservoir" },
  { key: "has_own_power", label: "I bring my own power", hint: "Generator, battery, or inverter" },
  { key: "has_pressure_washer", label: "I have a pressure washer", hint: "Min 1.6 GPM" },
  { key: "can_detail_interior", label: "I can detail interiors", hint: "Vacuum, leather, dash" },
  { key: "can_do_paint_correction", label: "I can do paint correction", hint: "Polishers, compounds, ceramic" },
];

export function ProfileEditor({ userId, initial }: { userId: string; initial: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [base, setBase] = useState<{ lat: number; lng: number; label: string } | null>(
    initial.base_lat && initial.base_lng
      ? { lat: initial.base_lat, lng: initial.base_lng, label: "Saved base location" }
      : null
  );
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          display_name: form.display_name || null,
          bio: form.bio.trim() || null,
          service_radius_miles: form.service_radius_miles,
          base_lat: base?.lat ?? form.base_lat,
          base_lng: base?.lng ?? form.base_lng,
          has_own_water: form.has_own_water,
          has_own_power: form.has_own_power,
          has_pressure_washer: form.has_pressure_washer,
          can_detail_interior: form.can_detail_interior,
          can_do_paint_correction: form.can_do_paint_correction,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Could not save");
      }
      toast("Profile saved", "success");
      router.push("/pro/me");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* About */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
          Avatar
        </div>
        <AvatarUpload
          userId={userId}
          initialPath={form.avatar_url}
          initialName={form.display_name || form.full_name}
          invert
          onChange={(p) => set("avatar_url", p)}
        />

        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mt-5 mb-2">
          About
        </div>
        <input
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="Full name"
          className="w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
        <input
          value={form.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          placeholder="Display name (what customers see — e.g. Tj W.)"
          maxLength={60}
          className="w-full mt-3 px-4 py-3.5 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="Short bio — show up on your /r/HANDLE referral page (max 280)"
          rows={3}
          maxLength={280}
          className="w-full mt-3 px-4 py-3 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
      </section>

      {/* Service area */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
          Service area
        </div>
        <AddressAutocomplete
          onSelect={(r) =>
            setBase({ lat: r.lat, lng: r.lng, label: r.name })
          }
          placeholder="Where do you start your day?"
        />
        {base && (
          <div className="mt-2 bg-white/5 px-3 py-2 text-xs text-bone/70 font-mono">
            ✓ {base.label}
          </div>
        )}
        <label className="block mt-4">
          <div className="flex justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-bone/60">
              Service radius
            </span>
            <span className="display tabular text-bone">
              {form.service_radius_miles} mi
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={form.service_radius_miles}
            onChange={(e) => set("service_radius_miles", Number(e.target.value))}
            className="w-full mt-2 accent-sol"
          />
        </label>

        {/* Live preview of the area the pro will be matched within. Only
            renders once we know a base location — no map blank state. */}
        {(base?.lat != null || form.base_lat != null) && (
          <div className="mt-3">
            <ServiceRadiusMap
              lat={(base?.lat ?? form.base_lat) as number}
              lng={(base?.lng ?? form.base_lng) as number}
              radiusMiles={form.service_radius_miles}
              height={200}
            />
          </div>
        )}
      </section>

      {/* Equipment */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
          Equipment
        </div>
        <div className="space-y-2">
          {equipmentOpts.map((opt) => {
            const on = !!form[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => set(opt.key, !on as any)}
                className={`w-full text-left p-3 transition border ${
                  on ? "bg-sol text-ink border-sol" : "bg-white/5 text-bone border-bone/15 hover:bg-white/10"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        on ? "text-ink/70" : "text-bone/50"
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 w-5 h-5 flex items-center justify-center border ${
                      on ? "bg-ink border-ink text-sol" : "border-bone/40"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-bone/50 mt-3 leading-relaxed">
          Customers see your equipment in your /r/HANDLE profile and the queue surfaces
          equipment-matched jobs to you first.
        </p>
      </section>

      <button
        onClick={save}
        disabled={busy || !form.full_name}
        className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-bone"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/customer/AddressAutocomplete";
import { AvatarUpload } from "@/components/customer/AvatarUpload";
import { ServiceRadiusMap } from "@/components/pro/ServiceRadiusMap";
import { toast } from "@/components/ui/Toast";
import { useTranslations } from "next-intl";

type Initial = {
  full_name: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  service_radius_miles: number;
  base_lat: number | null;
  base_lng: number | null;
  // Optional override list of cities. If non-empty the queue only
  // surfaces jobs whose address city matches one of these
  // (case-insensitive). Empty = fall back to radius-from-base.
  service_areas: string[];
  has_own_water: boolean;
  has_own_power: boolean;
  has_pressure_washer: boolean;
  can_detail_interior: boolean;
  can_do_paint_correction: boolean;
};

export function ProfileEditor({ userId, initial }: { userId: string; initial: Initial }) {
  const t = useTranslations("proMe");
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [base, setBase] = useState<{ lat: number; lng: number; label: string } | null>(
    initial.base_lat && initial.base_lng
      ? { lat: initial.base_lat, lng: initial.base_lng, label: t("editBaseSaved") }
      : null
  );
  const [busy, setBusy] = useState(false);
  // Draft text for the "Cities you'll take jobs in" chip input. Lives
  // here (not in form state) because we only persist when the user
  // commits a chip via Enter / comma / blur.
  const [cityDraft, setCityDraft] = useState("");

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
    { key: "has_own_water", label: t("equipWaterLabel"), hint: t("equipWaterHint") },
    { key: "has_own_power", label: t("equipPowerLabel"), hint: t("equipPowerHint") },
    { key: "has_pressure_washer", label: t("equipPressureLabel"), hint: t("equipPressureHint") },
    { key: "can_detail_interior", label: t("equipInteriorLabel"), hint: t("equipInteriorHint") },
    { key: "can_do_paint_correction", label: t("equipPaintLabel"), hint: t("equipPaintHint") },
  ];

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function commitCity(raw: string) {
    const city = raw.trim().replace(/^,+|,+$/g, "").trim();
    if (!city) return;
    setForm((s) => {
      if (s.service_areas.some((c) => c.toLowerCase() === city.toLowerCase())) {
        return s;
      }
      return { ...s, service_areas: [...s.service_areas, city] };
    });
    setCityDraft("");
  }

  function removeCity(city: string) {
    setForm((s) => ({
      ...s,
      service_areas: s.service_areas.filter((c) => c !== city),
    }));
  }

  async function save() {
    setBusy(true);
    try {
      // Auto-commit any half-typed city before saving so a pro who
      // typed "Riverside" and tapped Save (without hitting Enter)
      // doesn't lose it.
      const finalAreas = (() => {
        const draft = cityDraft.trim();
        if (!draft) return form.service_areas;
        if (form.service_areas.some((c) => c.toLowerCase() === draft.toLowerCase())) {
          return form.service_areas;
        }
        return [...form.service_areas, draft];
      })();

      const r = await fetch("/api/pro/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          display_name: form.display_name || null,
          bio: form.bio.trim() || null,
          service_radius_miles: form.service_radius_miles,
          service_areas: finalAreas,
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
        throw new Error(d.error || t("editSaveError"));
      }
      toast(t("editSaved"), "success");
      router.push("/pro/me");
      router.refresh();
    } catch (e: any) {
      toast(e.message || t("editSaveError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* About */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
          {t("editAvatarLabel")}
        </div>
        <AvatarUpload
          userId={userId}
          initialPath={form.avatar_url}
          initialName={form.display_name || form.full_name}
          invert
          onChange={(p) => set("avatar_url", p)}
        />

        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mt-5 mb-2">
          {t("editAboutLabel")}
        </div>
        <input
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder={t("editFullNamePlaceholder")}
          className="w-full px-4 py-3.5 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
        <input
          value={form.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          placeholder={t("editDisplayNamePlaceholder")}
          maxLength={60}
          className="w-full mt-3 px-4 py-3.5 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder={t("editBioPlaceholder")}
          rows={3}
          maxLength={280}
          className="w-full mt-3 px-4 py-3 bg-white/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
        />
      </section>

      {/* Service area */}
      <section>
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-bone/60">
            {t("editAreaLabel")}
          </span>
          <span className="font-mono text-[10px] text-bone/40">
            {t("editAreaDefault")}
          </span>
        </div>
        <AddressAutocomplete
          onSelect={(r) =>
            setBase({ lat: r.lat, lng: r.lng, label: r.name })
          }
          placeholder={t("editAreaPlaceholder")}
        />
        {base && (
          <div className="mt-2 bg-sol text-ink px-3 py-2 text-xs font-mono uppercase tracking-wide">
            ✓ {t("editBaseFrom", { label: base.label })}
          </div>
        )}
        <p className="text-[11px] text-bone/50 mt-2 leading-relaxed">
          {t("editAreaHint")}
        </p>

        <label className="block mt-5">
          <div className="flex justify-between text-xs">
            <span className="font-mono uppercase tracking-wider text-bone/60">
              {t("editRadiusLabel")}
            </span>
            <span className="display tabular text-bone">
              {t("editRadiusValue", { miles: form.service_radius_miles })}
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

        {/* Extra cities the pro is willing to drive to even though they
            sit outside the radius above. Additive — a job qualifies if
            it's either in-radius OR its city matches one of these. */}
        <div className="mt-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-bone/60">
              {t("editCitiesLabel")}
            </span>
            <span className="font-mono text-[10px] text-bone/40">
              {t("editCitiesOptional")}
            </span>
          </div>
          {form.service_areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.service_areas.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 bg-sol text-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => removeCity(city)}
                    className="text-ink/70 hover:text-ink"
                    aria-label={t("editCityRemove", { city })}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            value={cityDraft}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) {
                commitCity(v.slice(0, -1));
              } else {
                setCityDraft(v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCity(cityDraft);
              } else if (e.key === "Backspace" && !cityDraft && form.service_areas.length > 0) {
                removeCity(form.service_areas[form.service_areas.length - 1]);
              }
            }}
            onBlur={() => commitCity(cityDraft)}
            placeholder={t("editCitiesPlaceholder")}
            className="w-full px-4 py-3.5 bg-bone border border-mist text-ink placeholder:text-smoke text-sm focus:outline-none focus:border-royal"
          />
          <p className="text-[11px] text-bone/50 mt-2 leading-relaxed">
            {t("editCitiesHint")}
          </p>
        </div>
      </section>

      {/* Equipment */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
          {t("editEquipmentLabel")}
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
          {t("editEquipmentHint")}
        </p>
      </section>

      <button
        onClick={save}
        disabled={busy || !form.full_name}
        className="w-full bg-sol text-ink py-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-bone"
      >
        {busy ? t("editSaving") : t("editSaveBtn")}
      </button>
    </div>
  );
}

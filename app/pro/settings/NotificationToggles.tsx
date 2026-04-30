"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

type Prefs = { push: boolean; email: boolean; sms: boolean };

const opts: { k: keyof Prefs; label: string; hint: string }[] = [
  { k: "push", label: "Push notifications", hint: "Job alerts, direct requests, customer messages." },
  { k: "email", label: "Email", hint: "Receipts, weekly earnings, account changes." },
  { k: "sms", label: "SMS", hint: "Urgent only — direct requests + cancellations." },
];

export function NotificationToggles({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [busy, setBusy] = useState<keyof Prefs | null>(null);

  async function toggle(k: keyof Prefs) {
    const next = !prefs[k];
    setBusy(k);
    setPrefs((p) => ({ ...p, [k]: next }));
    try {
      const r = await fetch("/api/pro/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [k]: next }),
      });
      if (!r.ok) throw new Error("Could not save");
    } catch {
      // Roll back.
      setPrefs((p) => ({ ...p, [k]: !next }));
      toast("Could not save preference", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white/5 p-5 mb-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-3">
        Notifications
      </div>
      <div className="space-y-3">
        {opts.map((o) => {
          const on = prefs[o.k];
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => toggle(o.k)}
              disabled={busy === o.k}
              className="w-full flex justify-between items-start text-left disabled:opacity-50"
            >
              <div className="flex-1 pr-3">
                <div className="text-sm font-bold">{o.label}</div>
                <div className="text-[11px] text-bone/55 mt-0.5 leading-relaxed">{o.hint}</div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center w-10 h-5 rounded-full transition ${
                  on ? "bg-sol" : "bg-bone/15"
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 rounded-full bg-bone transition transform ${
                    on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

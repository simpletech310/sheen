"use client";

import { useEffect, useRef, useState } from "react";

type LookupResult = {
  found: boolean;
  reason?: "format" | "not_active";
  handle?: string;
  name?: string;
  rating?: number | null;
  jobs?: number;
  verified?: boolean;
};

export function WasherHandleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (handle: string) => void;
}) {
  const [draft, setDraft] = useState(value.replace(/^@/, ""));
  const [status, setStatus] = useState<"idle" | "checking" | "match" | "no_match" | "format">(
    "idle"
  );
  const [match, setMatch] = useState<LookupResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChange(draft);
    if (!draft) {
      setStatus("idle");
      setMatch(null);
      return;
    }
    if (!/^[A-Z0-9]{3,20}$/.test(draft)) {
      setStatus("format");
      setMatch(null);
      return;
    }
    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/washers/lookup?handle=${encodeURIComponent(draft)}`);
        const d: LookupResult = await r.json();
        if (d.found) {
          setMatch(d);
          setStatus("match");
        } else {
          setMatch(null);
          setStatus("no_match");
        }
      } catch {
        setStatus("no_match");
        setMatch(null);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-lg text-smoke">
          @
        </span>
        <input
          value={draft}
          onChange={(e) =>
            setDraft(
              e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20)
            )
          }
          placeholder="Washer ID (e.g. JOHND)"
          className={`w-full pl-9 pr-4 py-3.5 bg-bone border text-sm font-mono tracking-wider focus:outline-none transition-colors ${
            status === "match"
              ? "border-good"
              : status === "no_match" || status === "format"
              ? "border-bad"
              : "border-mist focus:border-royal"
          }`}
        />
      </div>

      {status === "checking" && (
        <div className="text-[11px] text-smoke mt-2">Looking up @{draft}…</div>
      )}

      {status === "format" && draft.length > 0 && (
        <div className="text-[11px] text-bad mt-2">
          IDs are 3–20 letters/numbers, no symbols.
        </div>
      )}

      {status === "no_match" && (
        <div className="text-[11px] text-bad mt-2">
          No pro found with @{draft}. Double-check the ID with them.
        </div>
      )}

      {status === "match" && match && (
        <div className="mt-2 bg-good/15 border border-good p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-royal text-bone flex items-center justify-center display text-base shrink-0">
              {(match.name ?? "P")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                {match.name}
                {match.verified && (
                  <span className="font-mono text-[9px] uppercase tracking-wider bg-good text-bone px-1.5 py-0.5">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="text-xs text-smoke">
                {match.rating != null && (
                  <>
                    <span className="text-sol">★</span> {match.rating.toFixed(1)} ·{" "}
                  </>
                )}
                {match.jobs ?? 0} jobs
              </div>
            </div>
          </div>
          <div className="text-[11px] text-smoke mt-2 leading-relaxed">
            Booking will be sent to @{match.handle} for 10 minutes before opening
            to the queue.
          </div>
        </div>
      )}

      {status === "idle" && draft.length === 0 && (
        <div className="text-[11px] text-smoke mt-2 leading-relaxed">
          Have a pro&rsquo;s @washer ID? Paste it here. They get 10 minutes to
          accept before the booking opens to the general queue.
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Block = { day_of_week: number; start: string; end: string };

export default function AvailabilityPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/pro/availability");
      const data = await r.json();
      const rec: Block[] = (data.rules ?? [])
        .filter((x: any) => x.day_of_week !== null && x.specific_date === null)
        .map((x: any) => ({
          day_of_week: x.day_of_week,
          start: x.start_time?.slice(0, 5) ?? "09:00",
          end: x.end_time?.slice(0, 5) ?? "17:00",
        }));
      setBlocks(rec);
      setLoaded(true);
    })();
  }, []);

  function add(day: number) {
    setBlocks((s) => [...s, { day_of_week: day, start: "09:00", end: "17:00" }]);
  }
  function remove(idx: number) {
    setBlocks((s) => s.filter((_, i) => i !== idx));
  }
  function update(idx: number, k: keyof Block, v: any) {
    setBlocks((s) => s.map((b, i) => (i === idx ? { ...b, [k]: v } : b)));
  }

  async function save() {
    setSaving(true);
    const rules = blocks.map((b) => ({
      type: "recurring" as const,
      day_of_week: b.day_of_week,
      start_time: b.start + ":00",
      end_time: b.end + ":00",
    }));
    await fetch("/api/pro/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    setSaving(false);
    setSavedAt(new Date());
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pro/queue" className="text-bone/60 text-sm">
          ← Queue
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        Schedule
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR HOURS</h1>
      <p className="text-sm text-bone/60 mb-7">
        Recurring weekly availability. Jobs only show in your queue when you&rsquo;re open.
      </p>

      {!loaded && <p className="text-bone/60 text-sm">Loading…</p>}

      {loaded && (
        <div className="space-y-6">
          {days.map((d, i) => {
            const dayBlocks = blocks
              .map((b, idx) => ({ ...b, idx }))
              .filter((b) => b.day_of_week === i);
            return (
              <div key={d} className="border-t border-bone/10 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-bold uppercase tracking-wide text-sm">{d}</div>
                  <button
                    onClick={() => add(i)}
                    className="text-[10px] uppercase tracking-wide text-sol hover:text-bone"
                  >
                    + Add window
                  </button>
                </div>
                {dayBlocks.length === 0 ? (
                  <div className="text-xs text-bone/40">Off</div>
                ) : (
                  dayBlocks.map((b) => (
                    <div key={b.idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="time"
                        value={b.start}
                        onChange={(e) => update(b.idx, "start", e.target.value)}
                        className="bg-white/5 border border-bone/15 px-3 py-2 text-sm tabular flex-1"
                      />
                      <span className="text-bone/40">–</span>
                      <input
                        type="time"
                        value={b.end}
                        onChange={(e) => update(b.idx, "end", e.target.value)}
                        className="bg-white/5 border border-bone/15 px-3 py-2 text-sm tabular flex-1"
                      />
                      <button
                        onClick={() => remove(b.idx)}
                        className="text-bad text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex gap-3 items-center">
        <button
          onClick={save}
          disabled={saving}
          className="bg-sol text-ink px-6 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedAt && <span className="text-xs text-good">Saved {savedAt.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}

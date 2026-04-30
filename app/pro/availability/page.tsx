"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { toast } from "@/components/ui/Toast";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Recurring = { day_of_week: number; start: string; end: string };

export default function AvailabilityPage() {
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/pro/availability");
      const data = await r.json();
      const rec: Recurring[] = (data.rules ?? [])
        .filter((x: any) => x.day_of_week !== null && x.specific_date === null)
        .map((x: any) => ({
          day_of_week: x.day_of_week,
          start: x.start_time?.slice(0, 5) ?? "09:00",
          end: x.end_time?.slice(0, 5) ?? "17:00",
        }));
      const blk: string[] = (data.rules ?? [])
        .filter((x: any) => x.specific_date !== null && x.blocked === true)
        .map((x: any) => x.specific_date);
      setRecurring(rec);
      setBlocks(blk);
      setLoaded(true);
    })();
  }, []);

  function add(day: number) {
    setRecurring((s) => [...s, { day_of_week: day, start: "09:00", end: "17:00" }]);
  }
  function remove(idx: number) {
    setRecurring((s) => s.filter((_, i) => i !== idx));
  }
  function update(idx: number, k: keyof Recurring, v: any) {
    setRecurring((s) => s.map((b, i) => (i === idx ? { ...b, [k]: v } : b)));
  }

  function addBlock() {
    if (!newBlock) return;
    if (blocks.includes(newBlock)) return setNewBlock("");
    setBlocks((s) => [...s, newBlock].sort());
    setNewBlock("");
  }
  function removeBlock(d: string) {
    setBlocks((s) => s.filter((x) => x !== d));
  }

  async function save() {
    setSaving(true);
    const rules = [
      ...recurring.map((b) => ({
        type: "recurring" as const,
        day_of_week: b.day_of_week,
        start_time: b.start + ":00",
        end_time: b.end + ":00",
      })),
      ...blocks.map((d) => ({ type: "block" as const, specific_date: d })),
    ];
    try {
      const r = await fetch("/api/pro/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `Save failed (status ${r.status})`);
      }
      setSavedAt(new Date());
      toast("Hours saved", "success");
    } catch (e: any) {
      toast(e.message || "Could not save hours", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pro" className="text-bone/60 text-sm">
          ← Home
        </Link>
      </div>
      <Eyebrow className="!text-bone/60" prefix={null}>
        Schedule
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">YOUR HOURS</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-5" />
      <p className="text-sm text-bone/60 mb-7">
        Recurring weekly availability + one-off blocked dates. Jobs only show in your
        queue when you&rsquo;re open.
      </p>

      {!loaded && <p className="text-bone/60 text-sm">Loading…</p>}

      {loaded && (
        <>
          <div className="space-y-6">
            {days.map((d, i) => {
              const dayBlocks = recurring
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
                        <button onClick={() => remove(b.idx)} className="text-bad text-sm px-2">
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {/* Block-out dates */}
          <div className="mt-10 border-t border-bone/10 pt-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-bone/60 mb-2">
              Block-out dates
            </div>
            <p className="text-[11px] text-bone/50 mb-3 leading-relaxed">
              Vacation, maintenance, big events. Jobs scheduled on these dates won&rsquo;t hit
              your queue.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={newBlock}
                onChange={(e) => setNewBlock(e.target.value)}
                className="flex-1 bg-white/5 border border-bone/15 px-3 py-2 text-sm tabular text-bone"
              />
              <button
                onClick={addBlock}
                disabled={!newBlock}
                className="px-4 bg-sol text-ink text-xs font-bold uppercase tracking-wide disabled:opacity-50"
              >
                Block
              </button>
            </div>
            {blocks.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {blocks.map((d) => (
                  <div
                    key={d}
                    className="flex justify-between items-center bg-bad/15 border-l-2 border-bad px-3 py-2 text-xs"
                  >
                    <span className="font-mono tabular text-bone">
                      {new Date(d + "T12:00").toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => removeBlock(d)}
                      className="text-bad font-bold uppercase tracking-wide text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
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

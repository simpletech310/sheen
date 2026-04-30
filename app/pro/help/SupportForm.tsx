"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

export function SupportForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/pro/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not submit");
      setSentId(d.id);
      setSubject("");
      setBody("");
      toast("Sent · we'll be in touch", "success");
    } catch (e: any) {
      toast(e.message || "Could not submit", "error");
    } finally {
      setBusy(false);
    }
  }

  if (sentId) {
    return (
      <div className="bg-good/15 border-l-2 border-good p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-good mb-1">
          Sent
        </div>
        <div className="text-sm text-bone">
          Ticket logged. We respond within one business day.
        </div>
        <button
          onClick={() => setSentId(null)}
          className="mt-3 text-[10px] uppercase tracking-wider text-bone/60 hover:text-bone"
        >
          + Send another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 p-5 space-y-3">
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        maxLength={200}
        className="w-full px-4 py-3 bg-bone/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tell us what's going on. Include booking IDs if relevant."
        rows={5}
        maxLength={4000}
        className="w-full px-4 py-3 bg-bone/5 border border-bone/15 text-bone text-sm focus:outline-none focus:border-sol"
      />
      <button
        onClick={submit}
        disabled={busy || subject.trim().length < 3 || body.trim().length < 5}
        className="w-full bg-sol text-ink py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50 hover:bg-bone"
      >
        {busy ? "Sending…" : "Send to support"}
      </button>
      <p className="text-[11px] text-bone/50 leading-relaxed">
        Or email{" "}
        <a href="mailto:hello@sheen.co" className="text-sol underline">
          hello@sheen.co
        </a>{" "}
        directly.
      </p>
    </div>
  );
}

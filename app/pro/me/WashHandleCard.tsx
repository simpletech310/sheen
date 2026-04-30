"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const APP_BASE =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://sheen-iota.vercel.app";

export function WashHandleCard({ handle }: { handle: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(handle);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = `${APP_BASE}/r/${handle}`;
  // QR via Google Chart fallback (no client lib required) — falls back gracefully.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    shareUrl
  )}&color=003594&bgcolor=FFA300`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Could not copy", "error");
    }
  }

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/washers/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: draft }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      toast(`@${d.handle} saved`, "success");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-sol text-ink p-5 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-ink" />
      <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        Your washer ID
      </div>

      {editing ? (
        <div className="mt-2">
          <div className="flex items-center bg-ink text-bone overflow-hidden">
            <span className="px-3 py-3 font-mono text-2xl text-sol">@</span>
            <input
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))
              }
              maxLength={20}
              className="flex-1 bg-transparent display tabular text-3xl tracking-wider focus:outline-none"
            />
          </div>
          <div className="text-xs opacity-80 mt-2">
            3–20 letters/numbers · uppercase · must be unique
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={save}
              disabled={busy || draft.length < 3}
              className="flex-1 bg-ink text-bone py-2.5 text-xs font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(handle);
                setEditing(false);
              }}
              className="px-4 bg-bone text-ink py-2.5 text-xs font-bold uppercase tracking-wide"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="display tabular text-4xl mt-2 tracking-wider flex items-baseline gap-1">
            <span className="text-ink/60 text-3xl">@</span>
            <span>{handle}</span>
          </div>
          <div className="text-xs opacity-80 mt-2 leading-relaxed">
            Share this with returning customers. They get a 5-minute window to
            request you before the booking opens to the queue.
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => copy(`@${handle}`)}
              className="bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
            >
              {copied ? "Copied ✓" : "Copy @ID"}
            </button>
            <button
              onClick={() => copy(shareUrl)}
              className="bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
            >
              Copy link
            </button>
            <button
              onClick={() => setShowQR((s) => !s)}
              className="bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
            >
              {showQR ? "Hide QR" : "Show QR"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="bg-bone text-ink px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-mist transition"
            >
              Edit
            </button>
          </div>
          {showQR && (
            <div className="mt-4 bg-bone p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR code for @${handle}`}
                className="w-48 h-48 mx-auto"
              />
              <div className="text-xs text-smoke mt-3 break-all font-mono">
                {shareUrl}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

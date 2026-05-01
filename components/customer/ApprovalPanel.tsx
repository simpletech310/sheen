"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

/**
 * Customer-facing card on /app/tracking/[id] that gates fund release.
 *
 * States:
 *  - Not yet approved: shows work photos (if any), an Approve button,
 *    and a "Something's wrong" link to dispute.
 *  - Approved + released: green confirmation + Rate & tip CTA.
 *  - Approved but not released (Stripe gap): warning copy, ops will
 *    release manually.
 */
export function ApprovalPanel({
  bookingId,
  approvedAt,
  fundsReleasedAt,
  completedAt,
  workPhotoUrls,
}: {
  bookingId: string;
  approvedAt: string | null;
  fundsReleasedAt: string | null;
  completedAt: string | null;
  workPhotoUrls: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not approve");
      toast(
        d.released
          ? "Approved · pro paid"
          : "Approved · pro will be paid shortly",
        "success"
      );
      router.refresh();
      // Push them straight to rate + tip.
      router.push(`/app/rate/${bookingId}`);
    } catch (e: any) {
      toast(e.message || "Could not approve", "error");
      setBusy(false);
    }
  }

  if (approvedAt) {
    return (
      <div className="bg-good/10 border-l-2 border-good p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-good mb-1">
          {fundsReleasedAt ? "Approved · pro paid" : "Approved"}
        </div>
        <div className="text-sm text-ink">
          {fundsReleasedAt
            ? "Your pro's been paid. Thanks for the trust."
            : "Your pro will be paid shortly. We'll let you know if anything's off."}
        </div>
        <Link
          href={`/app/rate/${bookingId}`}
          className="mt-4 block text-center bg-royal text-bone py-3 text-sm font-bold uppercase tracking-wide hover:bg-ink"
        >
          Rate &amp; tip →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-mist/40 p-5 border-l-2 border-sol">
      <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-1">
        Waiting for your approval · payment on hold
      </div>
      <div className="text-sm font-bold mb-1">Review the finished work</div>
      <p className="text-xs text-smoke leading-relaxed">
        Your pro marked the wash complete
        {completedAt
          ? ` ${new Date(completedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : ""}
        . Approve to pay your pro, or flag an issue and we&rsquo;ll review.
      </p>

      {Object.keys(workPhotoUrls).length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(workPhotoUrls).map(([path, url]) => (
              <div key={path} className="aspect-square bg-bone/50 border border-mist relative overflow-hidden">
                <img
                  src={url}
                  alt="Finished work"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Note for your pro (optional)"
          className="mt-3 w-full px-3 py-2 bg-bone border border-mist text-sm focus:outline-none focus:border-ink"
        />
      )}

      <button
        onClick={approve}
        disabled={busy}
        className="mt-4 w-full bg-royal text-bone py-4 text-sm font-bold uppercase tracking-wide hover:bg-ink disabled:opacity-50 transition"
      >
        {busy ? "Approving…" : "Approve · pay your pro →"}
      </button>

      <button
        type="button"
        onClick={() => setShowNote((s) => !s)}
        className="mt-3 block w-full text-center text-[11px] uppercase tracking-wider text-smoke hover:text-ink"
      >
        {showNote ? "Hide note" : "+ Add a note for your pro"}
      </button>

      <Link
        href={`/app/rate/${bookingId}?dispute=1`}
        className="mt-4 block text-center text-[11px] uppercase tracking-wider text-bad underline"
      >
        Something&rsquo;s wrong → file a dispute
      </Link>
    </div>
  );
}

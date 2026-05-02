"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

/**
 * Customer-facing card on /app/tracking/[id] and /app/washes/[id] that
 * gates fund release.
 *
 * States:
 *  - Not yet approved: shows the 4 finished-work photos, an Approve
 *    button (which fires release.ts → wash payout), and an inline
 *    "Something's wrong" form that lets the customer attach a photo
 *    or short video as evidence.
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

  // Inline dispute / objection state.
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [evidence, setEvidence] = useState<
    { path: string; mime: string; previewUrl: string }[]
  >([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  async function uploadEvidence(file: File) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast("File too large — keep it under 50 MB", "error");
      return;
    }
    setUploadingEvidence(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 6) || "jpg";
      const sig = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "claim-evidence",
          scope: bookingId.replace(/-/g, "").slice(0, 32),
          ext,
        }),
      });
      const sigData = await sig.json();
      if (!sig.ok) throw new Error(sigData.error || "Upload setup failed");

      const put = await fetch(sigData.signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      const previewUrl = URL.createObjectURL(file);
      setEvidence((prev) => [
        ...prev,
        { path: sigData.path, mime: file.type, previewUrl },
      ]);
      toast("Evidence added", "success");
    } catch (e: any) {
      toast(e.message || "Could not upload evidence", "error");
    } finally {
      setUploadingEvidence(false);
    }
  }

  async function submitDispute() {
    if (disputeText.trim().length < 10) {
      toast("Add a short description of what went wrong (at least 10 chars)", "error");
      return;
    }
    setSubmittingDispute(true);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: disputeText.trim(),
          photos: evidence.map((e) => e.path),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not submit");
      toast("Filed — we'll review and get back to you", "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Could not submit", "error");
      setSubmittingDispute(false);
    }
  }

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
          <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-2">
            Finished-work photos · {Object.keys(workPhotoUrls).length}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(workPhotoUrls).map(([path, url], idx) => {
              const isVideo = /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(path);
              return (
                <a
                  key={path}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square bg-bone/50 border border-mist relative overflow-hidden block group"
                  aria-label={`Open finished-work ${isVideo ? "video" : "photo"} ${idx + 1}`}
                >
                  {isVideo ? (
                    <>
                      <video
                        src={url}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="absolute bottom-1 right-1 bg-ink/80 text-bone font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5">
                        ▶ Video
                      </span>
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={url}
                      alt="Finished work"
                      className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105"
                    />
                  )}
                </a>
              );
            })}
          </div>
          <p className="text-[11px] text-smoke leading-relaxed mt-2">
            Tap any photo to view full-size. Compare with how it looked when
            you booked — if anything's off, file a dispute below.
          </p>
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

      {/* Inline dispute form — opens below when the customer flags an
          issue. Lets them attach photos *or* short videos as proof.
          Files go into the claim-evidence bucket; the API records a
          row in damage_claims and flips the booking to status='disputed'
          so funds can't auto-release. */}
      {!disputeOpen ? (
        <button
          type="button"
          onClick={() => setDisputeOpen(true)}
          className="mt-4 block w-full text-center text-[11px] uppercase tracking-wider text-bad underline"
        >
          Something&rsquo;s wrong → file an objection
        </button>
      ) : (
        <div className="mt-4 bg-bad/5 border-l-2 border-bad p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-1">
            File an objection
          </div>
          <p className="text-xs text-smoke leading-relaxed mb-3">
            Tell us what&rsquo;s off and attach a photo or short video as
            proof. Funds stay on hold while we review.
          </p>
          <textarea
            value={disputeText}
            onChange={(e) => setDisputeText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What's wrong? (at least 10 characters)"
            className="w-full px-3 py-2 bg-bone border border-mist text-sm focus:outline-none focus:border-ink"
          />

          {evidence.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {evidence.map((e, i) => (
                <div
                  key={i}
                  className="relative aspect-square bg-bone border border-mist overflow-hidden"
                >
                  {e.mime.startsWith("video/") ? (
                    <video
                      src={e.previewUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={e.previewUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-ink/70 text-bone font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 text-center">
                    {e.mime.startsWith("video/") ? "Video" : "Photo"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <label
            className={`mt-3 block w-full text-center py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition border border-dashed ${
              uploadingEvidence
                ? "bg-mist text-smoke border-mist"
                : "bg-bone text-ink border-smoke hover:bg-mist/40"
            }`}
          >
            {uploadingEvidence
              ? "Uploading…"
              : evidence.length > 0
              ? "+ Add another photo or video"
              : "+ Attach photo or video"}
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              disabled={uploadingEvidence}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadEvidence(f);
                e.target.value = "";
              }}
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDisputeOpen(false)}
              disabled={submittingDispute}
              className="bg-mist text-ink py-3 text-xs font-bold uppercase tracking-wide hover:bg-smoke/20 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDispute}
              disabled={submittingDispute || disputeText.trim().length < 10}
              className="bg-bad text-bone py-3 text-xs font-bold uppercase tracking-wide hover:bg-ink transition disabled:opacity-50"
            >
              {submittingDispute ? "Submitting…" : "Submit objection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

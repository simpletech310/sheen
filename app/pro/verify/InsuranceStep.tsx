"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function InsuranceStep({
  docPath,
  expiresAt,
}: {
  docPath: string | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(!docPath);
  const [expDate, setExpDate] = useState("");
  const [busy, setBusy] = useState(false);

  // Status pill colour. Empty = todo (sol). Far out = good. Soon = sol. Past = bad.
  let pill: { tone: "good" | "sol" | "bad"; label: string };
  if (!docPath) pill = { tone: "sol", label: "Todo" };
  else if (!expiresAt) pill = { tone: "sol", label: "Active" };
  else {
    const d = new Date(expiresAt);
    const days = Math.round((d.getTime() - Date.now()) / 86400000);
    if (days < 0) pill = { tone: "bad", label: "Expired" };
    else if (days < 30) pill = { tone: "sol", label: `Expires in ${days}d` };
    else pill = { tone: "good", label: "Active" };
  }

  async function submit() {
    const f = fileRef.current?.files?.[0];
    if (!f) return toast("Pick a file first", "error");
    if (!expDate) return toast("Add the expiration date", "error");
    setBusy(true);
    try {
      // 1. Get a signed upload URL.
      const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
      const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "washer-documents", scope: "insurance", ext }),
      });
      if (!r.ok) throw new Error("Could not start upload");
      const { signed_url, path } = await r.json();

      // 2. Put the file directly to the signed URL.
      const put = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": f.type || "application/octet-stream" },
        body: f,
      });
      if (!put.ok) throw new Error("Upload failed");

      // 3. Tell the server to record the path + expiration.
      const post = await fetch("/api/pro/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_path: path, expires_at: expDate }),
      });
      if (!post.ok) {
        const d = await post.json().catch(() => ({}));
        throw new Error(d.error || "Could not save insurance");
      }
      toast("Insurance saved · admin will review", "success");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      toast(e.message || "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`p-5 border-l-2 ${
        pill.tone === "good"
          ? "bg-good/10 border-good"
          : pill.tone === "bad"
          ? "bg-bad/15 border-bad"
          : "bg-white/5 border-sol"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            Step 02 · Insurance
          </div>
          <div className="text-sm font-bold mt-1">
            {docPath ? "Insurance on file" : "Upload proof of insurance"}
          </div>
          <p className="text-[12px] text-bone/65 mt-1.5 leading-relaxed">
            $1M general liability. PDF or image of the certificate.
          </p>
          {docPath && expiresAt && !editing && (
            <p className="text-[11px] text-bone/55 mt-1.5 font-mono tabular">
              Expires {new Date(expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 ${
            pill.tone === "good"
              ? "bg-good text-ink"
              : pill.tone === "bad"
              ? "bg-bad text-bone"
              : "bg-sol text-ink"
          }`}
        >
          {pill.label}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/heic"
            className="block w-full text-xs text-bone/70 file:bg-sol file:text-ink file:px-3 file:py-2 file:border-0 file:font-bold file:uppercase file:tracking-wide file:mr-3"
          />
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-bone/50 mb-1 block">
              Expiration date
            </label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-bone/15 text-bone text-sm tabular focus:outline-none focus:border-sol"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 bg-sol text-ink py-3 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Submit"}
            </button>
            {docPath && (
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="px-4 bg-bone text-ink py-3 text-xs font-bold uppercase tracking-wide"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full py-3 text-xs font-bold uppercase tracking-wide bg-bone/10 text-bone hover:bg-bone hover:text-ink transition"
        >
          Replace insurance →
        </button>
      )}
    </div>
  );
}

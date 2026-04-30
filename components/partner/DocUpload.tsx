"use client";

import { useState } from "react";

type Props = {
  bucket: "insurance-docs" | "partner-portfolio";
  scope: string;
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onChange: (paths: string[]) => void;
  initialPaths?: string[];
};

export function DocUpload({
  bucket,
  scope,
  accept,
  multiple = false,
  label,
  hint,
  onChange,
  initialPaths = [],
}: Props) {
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const next: string[] = multiple ? [...paths] : [];
      for (const file of Array.from(files)) {
        const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
        // 1. Get signed-upload URL
        const sig = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, scope, ext }),
        });
        const sigData = await sig.json();
        if (!sig.ok) throw new Error(sigData.error || "Could not get upload URL");

        // 2. PUT the file directly to Supabase Storage
        const put = await fetch(sigData.signed_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        next.push(sigData.path);
      }
      setPaths(next);
      onChange(next);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function remove(path: string) {
    const next = paths.filter((p) => p !== path);
    setPaths(next);
    onChange(next);
  }

  return (
    <div className="bg-mist/50 p-5">
      <div className="text-sm font-semibold">{label}</div>
      {hint && <div className="text-xs text-smoke mt-1">{hint}</div>}

      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
        className="mt-3 text-xs"
        disabled={busy}
      />

      {busy && <div className="mt-2 text-xs text-smoke">Uploading…</div>}
      {err && <div className="mt-2 text-xs text-bad">{err}</div>}

      {paths.length > 0 && (
        <ul className="mt-3 space-y-1">
          {paths.map((p) => (
            <li key={p} className="text-xs text-smoke flex justify-between items-center bg-bone px-2 py-1.5">
              <span className="font-mono truncate">{p.split("/").pop()}</span>
              <button
                type="button"
                onClick={() => remove(p)}
                className="text-bad text-[10px] uppercase ml-2"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

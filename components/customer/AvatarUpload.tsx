"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function avatarPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPA_URL}/storage/v1/object/public/avatars/${path}`;
}

export function AvatarUpload({
  userId,
  initialPath,
  initialName,
  onChange,
  size = 80,
  invert = false,
}: {
  userId: string;
  initialPath?: string | null;
  initialName?: string | null;
  onChange?: (newPath: string | null) => void;
  size?: number;
  // If true, render against a dark background (washer profile).
  invert?: boolean;
}) {
  const [path, setPath] = useState<string | null>(initialPath ?? null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (initialName ?? "S")[0]?.toUpperCase() ?? "S";
  const url = avatarPublicUrl(path);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Pick an image file (jpg, png, webp)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Image is over 5MB — try a smaller one", "error");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      // Path convention: <user_id>/avatar-<timestamp>.<ext>. RLS on the
      // storage bucket only lets the owning user write under their folder.
      const objectPath = `${userId}/avatar-${Date.now()}.${ext.slice(0, 6) || "jpg"}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(objectPath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);

      // Persist path on the users row so every render-side surface
      // (chat headers, public profile, queue cards) picks it up.
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: objectPath }),
      });
      if (!r.ok) throw new Error("Could not save avatar");

      setPath(objectPath);
      onChange?.(objectPath);
      toast("Avatar updated", "success");
    } catch (e: any) {
      toast(e.message || "Could not upload avatar", "error");
    } finally {
      setBusy(false);
    }
  }

  async function clearAvatar() {
    setBusy(true);
    try {
      const r = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });
      if (!r.ok) throw new Error("Could not clear avatar");
      setPath(null);
      onChange?.(null);
    } catch (e: any) {
      toast(e.message || "Could not clear avatar", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative shrink-0 rounded-full overflow-hidden ${
          invert ? "bg-bone/10" : "bg-mist"
        }`}
        style={{ width: size, height: size }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center display ${
              invert ? "bg-royal text-bone" : "bg-royal text-bone"
            }`}
            style={{ fontSize: size * 0.4 }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition disabled:opacity-50 ${
            invert
              ? "bg-sol text-ink hover:bg-bone"
              : "bg-ink text-bone hover:bg-royal"
          }`}
        >
          {busy ? "…" : url ? "Change photo" : "Upload photo"}
        </button>
        {path && !busy && (
          <button
            type="button"
            onClick={clearAvatar}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
              invert
                ? "bg-bone/10 text-bone/80 hover:bg-bone/20"
                : "bg-mist text-smoke hover:bg-mist/70"
            }`}
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "@/components/ui/Toast";

type Message = {
  id: string;
  sender_id: string;
  body: string | null;
  image_path: string | null;
  read_at: string | null;
  created_at: string;
};

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Storage paths in `booking-photos` (bucket is private but signed below).
function bookingPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // The bucket is RLS-controlled. We sign on demand from the API rather than
  // expose a public URL — but for chat we read in-app where the user already
  // has a session, so the signed URL is short-lived and serverless.
  // Cheap path: use the public URL if available; fall back to a 1h signed URL
  // requested from the upload helper.
  return `${SUPA_URL}/storage/v1/object/public/booking-photos/${path}`;
}

export function ChatPanel({
  bookingId,
  currentUserId,
  otherName,
  otherAvatarPath,
  variant = "customer",
}: {
  bookingId: string;
  currentUserId: string;
  otherName?: string | null;
  otherAvatarPath?: string | null;
  variant?: "customer" | "pro";
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  const otherAvatarUrl = otherAvatarPath
    ? `${SUPA_URL}/storage/v1/object/public/avatars/${otherAvatarPath}`
    : null;
  const otherInitial = (otherName ?? "?")[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        setMessages(d.messages ?? []);
        const u = (d.messages ?? []).filter(
          (m: Message) => m.sender_id !== currentUserId && !m.read_at
        ).length;
        setUnread(u);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [bookingId, currentUserId]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== currentUserId && !openRef.current) {
            setUnread((n) => n + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, currentUserId]);

  useEffect(() => {
    if (open && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open || unread === 0) return;
    fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" }).then(() => setUnread(0));
  }, [open, bookingId, unread]);

  async function sendMessage(payload: { body?: string; image_path?: string }) {
    const r = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.message) {
        setMessages((prev) => (prev.some((p) => p.id === d.message.id) ? prev : [...prev, d.message]));
      }
      return true;
    }
    const d = await r.json().catch(() => ({}));
    toast(d.error || "Could not send message", "error");
    return false;
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const ok = await sendMessage({ body: text });
      if (ok) setDraft("");
    } finally {
      setSending(false);
    }
  }

  // Photo upload — pushes through the existing /api/upload signed URL flow,
  // then fires a message that references the storage path. Server stores the
  // path; we render via the public booking-photos URL.
  async function uploadAndSend(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Pick an image file", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("Image is over 10MB — try a smaller one", "error");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const sig = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "booking-photos",
          scope: `chat_${bookingId}`,
          ext: ext.slice(0, 6) || "jpg",
        }),
      });
      const sigData = await sig.json();
      if (!sig.ok) throw new Error(sigData.error || "Upload setup failed");

      const put = await fetch(sigData.signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      await sendMessage({ image_path: sigData.path });
    } catch (e: any) {
      toast(e.message || "Could not send photo", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-bone border border-mist mt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Collapse chat" : "Expand chat"}
        aria-expanded={open}
        className="w-full flex justify-between items-center px-4 py-3 hover:bg-mist/40 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar — public URL for the other party. Falls back to a
              bone-on-royal initial circle when there's no photo. */}
          {otherAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherAvatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover bg-mist shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-royal text-bone display text-xs flex items-center justify-center shrink-0">
              {otherInitial}
            </div>
          )}
          <div className="text-left min-w-0">
            <div className="text-sm font-bold text-ink truncate">
              {otherName || (variant === "customer" ? "Your pro" : "Customer")}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-smoke">
              Chat
            </div>
          </div>
          {unread > 0 && (
            <span className="bg-bad text-bone text-[10px] font-mono px-1.5 py-0.5 ml-1">{unread}</span>
          )}
        </div>
        <span className="text-smoke">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          <div
            ref={scrollerRef}
            className="max-h-72 overflow-y-auto px-4 py-3 border-t border-mist space-y-2 bg-mist/20"
          >
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-2/3 bg-mist/70 animate-pulse" />
                <div className="h-8 w-1/2 ml-auto bg-mist/70 animate-pulse" />
                <div className="h-8 w-3/5 bg-mist/70 animate-pulse" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-xs text-smoke text-center py-6">
                No messages yet. Say hi.
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === currentUserId;
                const imgUrl = bookingPhotoUrl(m.image_path);
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-2 text-sm ${
                        mine ? "bg-royal text-bone" : "bg-mist text-ink"
                      }`}
                    >
                      {imgUrl && (
                        <a href={imgUrl} target="_blank" rel="noreferrer" className="block mb-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt=""
                            className="max-w-full h-auto block"
                            loading="lazy"
                          />
                        </a>
                      )}
                      {m.body && (
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      )}
                      <div className={`text-[10px] mt-1 ${mine ? "text-bone/70" : "text-smoke"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-mist">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndSend(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending}
              aria-label="Attach photo"
              className="px-3 bg-mist text-ink text-base hover:bg-mist/70 disabled:opacity-50"
            >
              {uploading ? "…" : "📷"}
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message"
              maxLength={2000}
              className="flex-1 px-3 py-2.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              className="px-4 bg-ink text-bone text-sm font-bold uppercase tracking-wide hover:bg-royal disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

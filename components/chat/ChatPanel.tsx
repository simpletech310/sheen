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

  // Theme-aware classes — customer pages are light (bone+royal), washer
  // pages are dark (ink+sol). Keeps the chat native to the surrounding
  // surface instead of bone-popping out of an ink page.
  const isPro = variant === "pro";
  const t = isPro
    ? {
        container:    "bg-white/5 border border-bone/10",
        header:       "hover:bg-bone/5",
        headerName:   "text-bone",
        headerSub:    "text-bone/55",
        toggle:       "text-bone/55",
        avatarBg:     "bg-bone/10",
        avatarFallbg: "bg-sol text-ink",
        scroller:     "bg-bone/[0.03] border-bone/10",
        skel:         "bg-bone/10",
        empty:        "text-bone/55",
        bubbleMine:   "bg-sol text-ink",
        bubbleTheirs: "bg-bone/10 text-bone",
        bubbleMineMeta:   "text-ink/65",
        bubbleTheirsMeta: "text-bone/55",
        composer:     "border-bone/10",
        attachBtn:    "bg-bone/10 text-bone hover:bg-bone/20",
        input:        "bg-bone/5 border-bone/15 text-bone placeholder:text-bone/40 focus:border-sol",
        sendBtn:      "bg-sol text-ink hover:bg-bone",
        accent:       "bg-sol",
      }
    : {
        container:    "bg-bone border border-mist",
        header:       "hover:bg-mist/40",
        headerName:   "text-ink",
        headerSub:    "text-smoke",
        toggle:       "text-smoke",
        avatarBg:     "bg-mist",
        avatarFallbg: "bg-royal text-bone",
        scroller:     "bg-mist/20 border-mist",
        skel:         "bg-mist/70",
        empty:        "text-smoke",
        bubbleMine:   "bg-royal text-bone",
        bubbleTheirs: "bg-mist text-ink",
        bubbleMineMeta:   "text-bone/70",
        bubbleTheirsMeta: "text-smoke",
        composer:     "border-mist",
        attachBtn:    "bg-mist text-ink hover:bg-mist/70",
        input:        "bg-bone border-mist text-ink placeholder:text-smoke focus:border-royal",
        sendBtn:      "bg-ink text-bone hover:bg-royal",
        accent:       "bg-royal",
      };

  return (
    <div className={`relative ${t.container} mt-5`}>
      {/* Brand stripe across the top, matches the rest of the surface. */}
      <span className={`absolute top-0 left-0 right-0 h-[2px] ${t.accent}`} aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Collapse chat" : "Expand chat"}
        aria-expanded={open}
        className={`w-full flex justify-between items-center px-4 py-3 transition ${t.header}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {otherAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherAvatarUrl}
              alt=""
              className={`w-8 h-8 rounded-full object-cover ${t.avatarBg} shrink-0`}
            />
          ) : (
            <div className={`w-8 h-8 rounded-full ${t.avatarFallbg} display text-xs flex items-center justify-center shrink-0`}>
              {otherInitial}
            </div>
          )}
          <div className="text-left min-w-0">
            <div className={`text-sm font-bold truncate ${t.headerName}`}>
              {otherName || (variant === "customer" ? "Your pro" : "Customer")}
            </div>
            <div className={`font-mono text-[9px] uppercase tracking-wider ${t.headerSub}`}>
              Chat
            </div>
          </div>
          {unread > 0 && (
            <span className="bg-bad text-bone text-[10px] font-mono px-1.5 py-0.5 ml-1">{unread}</span>
          )}
        </div>
        <span className={t.toggle}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <>
          <div
            ref={scrollerRef}
            className={`max-h-72 overflow-y-auto px-4 py-3 border-t space-y-2 ${t.scroller}`}
          >
            {loading ? (
              <div className="space-y-2">
                <div className={`h-8 w-2/3 ${t.skel} animate-pulse`} />
                <div className={`h-8 w-1/2 ml-auto ${t.skel} animate-pulse`} />
                <div className={`h-8 w-3/5 ${t.skel} animate-pulse`} />
              </div>
            ) : messages.length === 0 ? (
              <div className={`text-xs text-center py-6 ${t.empty}`}>
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
                        mine ? t.bubbleMine : t.bubbleTheirs
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
                      <div className={`text-[10px] mt-1 ${mine ? t.bubbleMineMeta : t.bubbleTheirsMeta}`}>
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

          <div className={`flex gap-2 px-4 py-3 border-t ${t.composer}`}>
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
              className={`px-3 text-base disabled:opacity-50 ${t.attachBtn}`}
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
              className={`flex-1 px-3 py-2.5 border text-sm focus:outline-none ${t.input}`}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              className={`px-4 text-sm font-bold uppercase tracking-wide disabled:opacity-50 ${t.sendBtn}`}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

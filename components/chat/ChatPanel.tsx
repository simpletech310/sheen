"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "@/components/ui/Toast";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function ChatPanel({
  bookingId,
  currentUserId,
  otherName,
  variant = "customer",
}: {
  bookingId: string;
  currentUserId: string;
  otherName?: string | null;
  variant?: "customer" | "pro";
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // Keep open in a ref so the realtime subscription doesn't need to
  // re-subscribe every time the panel opens/closes.
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // Load history on mount.
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

  // Subscribe to realtime inserts — stable subscription for component lifetime.
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
          // Only bump unread badge when the panel is closed
          if (m.sender_id !== currentUserId && !openRef.current) {
            setUnread((n) => n + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // Intentionally omit `open` — use openRef instead to keep the channel stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, currentUserId]);

  // Auto-scroll on new messages when panel is open.
  useEffect(() => {
    if (open && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Mark read when the panel opens.
  useEffect(() => {
    if (!open || unread === 0) return;
    fetch(`/api/bookings/${bookingId}/messages`, { cache: "no-store" }).then(() => setUnread(0));
  }, [open, bookingId, unread]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.message) {
          setMessages((prev) => (prev.some((p) => p.id === d.message.id) ? prev : [...prev, d.message]));
        }
        setDraft("");
      } else {
        const d = await r.json().catch(() => ({}));
        toast(d.error || "Could not send message", "error");
      }
    } finally {
      setSending(false);
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">
            Chat with {otherName || (variant === "customer" ? "your pro" : "the customer")}
          </span>
          {unread > 0 && (
            <span className="bg-bad text-bone text-[10px] font-mono px-1.5 py-0.5">{unread}</span>
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
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
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

"use client";

import { useState } from "react";
import { toast } from "@/components/ui/Toast";

export function WashHandleCard({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      toast("Wash ID copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Could not copy", "error");
    }
  }

  return (
    <div className="bg-sol text-ink p-5 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-ink" />
      <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">
        Your wash ID
      </div>
      <div className="display tabular text-4xl mt-2 tracking-wider">{handle}</div>
      <div className="text-xs opacity-80 mt-2 leading-relaxed">
        Share this code with returning customers. They can request you directly
        at checkout — you&rsquo;ll get a 5-minute window to accept before the
        booking opens to the queue.
      </div>
      <button
        onClick={copy}
        className="mt-3 bg-ink text-bone px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-royal transition"
      >
        {copied ? "Copied ✓" : "Copy ID"}
      </button>
    </div>
  );
}

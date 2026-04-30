"use client";

import Link from "next/link";

export default function ProError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-5 pt-16 pb-8 text-center text-bone">
      <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-3">
        ── Error
      </div>
      <h1 className="display text-3xl mb-3">Something broke.</h1>
      <p className="text-sm text-bone/70 mb-6">
        We logged it. Try again or head to the queue.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={reset}
          className="bg-bone text-ink px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Try again
        </button>
        <Link
          href="/pro/queue"
          className="bg-cobalt text-bone px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Queue
        </Link>
      </div>
      {error.digest && (
        <div className="mt-6 font-mono text-[10px] text-bone/50">ref · {error.digest}</div>
      )}
    </div>
  );
}

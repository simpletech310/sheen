"use client";

import Link from "next/link";

export default function PartnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-5 pt-16 pb-8 text-center bg-bone min-h-[60vh]">
      <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-3">
        ── Error
      </div>
      <h1 className="display text-3xl mb-3">Something broke.</h1>
      <p className="text-sm text-smoke mb-6">
        Try again or head back to your dashboard.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={reset}
          className="bg-ink text-bone px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Try again
        </button>
        <Link
          href="/partner/dashboard"
          className="bg-mist text-ink px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Dashboard
        </Link>
      </div>
      {error.digest && (
        <div className="mt-6 font-mono text-[10px] text-smoke">ref · {error.digest}</div>
      )}
    </div>
  );
}

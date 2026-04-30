"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-5 pt-16 pb-8 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-3">
        ── Admin error
      </div>
      <h1 className="display text-3xl mb-3">Query failed.</h1>
      <p className="text-sm text-smoke mb-6">
        Most likely a transient issue. Try again or check the audit log.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={reset}
          className="bg-ink text-bone px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="bg-mist text-ink px-5 py-3 text-sm font-bold uppercase tracking-wide"
        >
          Overview
        </Link>
      </div>
      {error.digest && (
        <div className="mt-6 font-mono text-[10px] text-smoke">ref · {error.digest}</div>
      )}
    </div>
  );
}

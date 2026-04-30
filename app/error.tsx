"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-bad mb-4">
          ── Error
        </div>
        <h1 className="display text-[56px] leading-none mb-3">SOMETHING BROKE.</h1>
        <p className="text-sm text-smoke mb-7">
          We logged this. If it keeps happening, email us at{" "}
          <a href="mailto:hello@sheen.co" className="underline text-ink">
            hello@sheen.co
          </a>
          .
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="bg-ink text-bone px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-royal"
          >
            Try again
          </button>
          <Link
            href="/"
            className="bg-mist text-ink px-5 py-3 text-sm font-bold uppercase tracking-wide hover:bg-mist/80"
          >
            Home
          </Link>
        </div>
        {error.digest && (
          <div className="mt-8 font-mono text-[10px] text-smoke">ref · {error.digest}</div>
        )}
      </div>
    </div>
  );
}

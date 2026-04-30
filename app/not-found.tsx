import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="font-mono text-[10px] uppercase tracking-wider text-smoke mb-4">
          ── 404
        </div>
        <h1 className="display text-[80px] leading-none mb-3 tabular">
          NOT <span className="text-royal">FOUND</span>
        </h1>
        <p className="text-sm text-smoke mb-7">
          That page doesn&rsquo;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-ink text-bone px-6 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-royal"
        >
          Back home →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

export type LightboxImage = { url: string; caption?: string };

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);

  const prev = useCallback(
    () => setI((n) => (n - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(
    () => setI((n) => (n + 1) % images.length),
    [images.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    // Prevent body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [prev, next, onClose]);

  if (images.length === 0) return null;
  const cur = images[i];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[200] bg-ink/95 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex justify-between items-center px-4 py-3 text-bone"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[11px] uppercase tracking-wider opacity-80 tabular">
          {i + 1} / {images.length}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="bg-bone text-ink w-8 h-8 flex items-center justify-center text-lg leading-none hover:bg-sol transition"
        >
          ×
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center px-2 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-bone/10 text-bone text-xl hover:bg-bone hover:text-ink transition"
          >
            ‹
          </button>
        )}
        <div className="flex-1 flex items-center justify-center px-2 min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt={cur.caption ?? ""}
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
        {images.length > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-bone/10 text-bone text-xl hover:bg-bone hover:text-ink transition"
          >
            ›
          </button>
        )}
      </div>

      {/* Bottom: caption + thumbnail strip */}
      <div className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {cur.caption && (
          <div className="text-bone text-sm text-center mb-3">{cur.caption}</div>
        )}
        {images.length > 1 && (
          <div className="flex gap-1.5 justify-center overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`View photo ${idx + 1}`}
                aria-current={idx === i ? "true" : undefined}
                className={`shrink-0 w-12 h-12 overflow-hidden border-2 transition ${
                  idx === i ? "border-sol" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

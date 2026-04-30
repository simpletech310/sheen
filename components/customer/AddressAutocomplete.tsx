"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "@/lib/mapbox";

export function AddressAutocomplete({
  value,
  onSelect,
  placeholder = "Street address",
}: {
  value?: string;
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q.trim() || q.length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&near_lat=34.0522&near_lng=-118.2437`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  function pick(r: GeocodeResult) {
    setQ(r.full_address);
    setOpen(false);
    onSelect(r);
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-4 py-3.5 bg-bone border border-mist text-sm focus:outline-none focus:border-royal"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-bone border border-mist max-h-72 overflow-y-auto z-50 shadow-lg">
          {results.map((r) => (
            <li
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className="px-4 py-3 text-sm hover:bg-mist cursor-pointer border-b border-mist last:border-b-0"
            >
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-smoke mt-0.5">{r.full_address}</div>
            </li>
          ))}
        </ul>
      )}
      {loading && q.length >= 3 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bone border border-mist p-3 text-xs text-smoke">
          Searching…
        </div>
      )}
    </div>
  );
}

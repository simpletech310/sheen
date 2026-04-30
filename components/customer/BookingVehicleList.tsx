"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";

type BookingVehicle = {
  vehicle_id: string;
  condition_photo_paths: string[];
  vehicles: {
    year: number | null;
    make: string | null;
    model: string | null;
    color: string | null;
    plate: string | null;
    notes: string | null;
  } | null;
};

export function BookingVehicleList({
  rows,
  signedPhotoUrls,
  showNotes = true,
  dark = false,
}: {
  rows: BookingVehicle[];
  signedPhotoUrls: Record<string, string>;
  showNotes?: boolean;
  dark?: boolean;
}) {
  // Open-state: which set of images + which index. null = closed.
  const [viewer, setViewer] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  if (rows.length === 0) return null;

  // Color tokens swap based on theme.
  const card = dark ? "bg-white/5" : "bg-mist/40";
  const innerCard = dark ? "bg-white/10" : "bg-bone";
  const subtle = dark ? "text-bone/60" : "text-smoke";
  const accent = "border-sol";
  const body = dark ? "text-bone/85" : "text-ink/85";
  const photoBg = dark
    ? "bg-white/10 border-white/15 hover:border-bone"
    : "bg-mist border-mist hover:border-ink";
  const eyebrowClass = dark ? "!text-bone/60" : undefined;

  return (
    <>
      <div className="space-y-3">
        {rows.map((r, idx) => {
          const v = r.vehicles;
          const vehicleLabel = `${v?.year ? `${v.year} ` : ""}${v?.make ?? ""} ${
            v?.model ?? ""
          }`.trim();
          const images: LightboxImage[] = r.condition_photo_paths
            .map((p) => ({ url: signedPhotoUrls[p], caption: vehicleLabel }))
            .filter((img) => !!img.url);
          return (
            <div key={r.vehicle_id} className={`${card} p-4`}>
              <Eyebrow className={eyebrowClass} prefix={dark ? null : undefined}>
                Vehicle {rows.length > 1 ? `${idx + 1} / ${rows.length}` : ""}
              </Eyebrow>
              <div className={`text-sm font-semibold mt-2 ${dark ? "text-bone" : ""}`}>
                {vehicleLabel || "Vehicle"}
              </div>
              <div className={`text-xs ${subtle}`}>
                {v?.color ?? "—"}
                {v?.plate ? ` · ${v.plate}` : ""}
              </div>

              {showNotes && v?.notes && (
                <div className={`mt-3 ${innerCard} p-3 border-l-2 ${accent}`}>
                  <div className={`font-mono text-[10px] uppercase tracking-wider ${subtle} mb-1`}>
                    Special instructions
                  </div>
                  <p className={`text-xs leading-relaxed ${body} whitespace-pre-wrap`}>
                    {v.notes}
                  </p>
                </div>
              )}

              {r.condition_photo_paths.length > 0 && (
                <div className="mt-3">
                  <div className={`font-mono text-[10px] uppercase tracking-wider ${subtle} mb-2`}>
                    Pre-wash photos · {r.condition_photo_paths.length}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {r.condition_photo_paths.map((path, photoIdx) => {
                      const url = signedPhotoUrls[path];
                      return (
                        <button
                          key={path}
                          type="button"
                          onClick={() => {
                            if (images.length > 0) setViewer({ images, index: photoIdx });
                          }}
                          aria-label={`Open photo ${photoIdx + 1} of ${
                            r.condition_photo_paths.length
                          }`}
                          className={`block aspect-square overflow-hidden border transition cursor-zoom-in ${photoBg}`}
                        >
                          {url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className={`w-full h-full flex items-center justify-center text-[10px] ${subtle}`}
                            >
                              …
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewer && (
        <Lightbox
          images={viewer.images}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}

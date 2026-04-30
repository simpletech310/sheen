import { cn } from "@/lib/cn";

/**
 * Image-or-fallback block. If `src` is set, renders the photo; otherwise a
 * tonal block (Rams palette) with a small mono label. Keeps page layouts
 * intact whether or not we have real photography for a slot.
 */
export function Placeholder({
  label,
  height = 200,
  tone = "mist",
  className,
  src,
  alt,
}: {
  label: string;
  height?: number;
  tone?: "mist" | "ink" | "royal" | "sol";
  className?: string;
  src?: string;
  alt?: string;
}) {
  const bg =
    tone === "ink"
      ? "bg-ink/90 text-bone/60"
      : tone === "royal"
      ? "bg-royal text-bone"
      : tone === "sol"
      ? "bg-sol text-ink"
      : "bg-mist text-smoke";

  if (src) {
    return (
      <div className={cn("relative w-full overflow-hidden bg-mist", className)} style={{ height }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? label} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-center text-[10px] tracking-eyebrow uppercase font-mono",
        bg,
        className
      )}
      style={{ height }}
      aria-label={label}
    >
      ▢ {label}
    </div>
  );
}

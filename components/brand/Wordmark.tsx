import { cn } from "@/lib/cn";

/**
 * SHEEN wordmark — uppercase Anton, condensed athletic display.
 * Optional gold underbar in Rams gold #FFA300 when `highlight` is set.
 */
export function Wordmark({
  size = 24,
  highlight = false,
  className,
  invert = false,
}: {
  size?: number;
  highlight?: boolean;
  className?: string;
  invert?: boolean;
}) {
  return (
    <span
      className={cn(
        "display inline-block relative leading-none select-none tracking-wide",
        invert ? "text-bone" : "text-ink",
        className
      )}
      style={{ fontSize: size }}
    >
      SHEEN
      {highlight && (
        <span
          aria-hidden
          className="absolute left-0 right-0 bg-sol"
          style={{ bottom: -size * 0.12, height: Math.max(2, size * 0.08) }}
        />
      )}
    </span>
  );
}

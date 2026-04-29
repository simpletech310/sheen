import { cn } from "@/lib/cn";

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
  // Hairline diagonal through the second 'E' (PDF Concept A — "The Highlight")
  return (
    <span
      className={cn(
        "display inline-block relative leading-none select-none",
        invert ? "text-bone" : "text-ink",
        className
      )}
      style={{ fontSize: size, fontStyle: "italic", fontWeight: 400 }}
    >
      SHE
      <span className="relative inline-block">
        E
        {highlight && (
          <span
            aria-hidden
            className="absolute"
            style={{
              left: "10%",
              right: "-10%",
              top: "30%",
              height: 1,
              background: "currentColor",
              transform: "rotate(-30deg)",
              transformOrigin: "center",
            }}
          />
        )}
      </span>
      N
    </span>
  );
}

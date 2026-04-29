import { cn } from "@/lib/cn";

export function Placeholder({
  label,
  height = 200,
  tone = "mist",
  className,
}: {
  label: string;
  height?: number;
  tone?: "mist" | "ink" | "cobalt";
  className?: string;
}) {
  const bg =
    tone === "ink" ? "bg-ink/90 text-bone/40" : tone === "cobalt" ? "bg-cobalt/90 text-bone/60" : "bg-mist text-smoke";
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

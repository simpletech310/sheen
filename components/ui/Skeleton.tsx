import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-mist/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-bone/60 before:to-transparent",
        "before:animate-shimmer",
        className
      )}
      aria-hidden
    />
  );
}

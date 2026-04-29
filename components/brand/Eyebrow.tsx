import { cn } from "@/lib/cn";

export function Eyebrow({
  children,
  className,
  prefix = "──",
}: {
  children: React.ReactNode;
  className?: string;
  prefix?: string | null;
}) {
  return (
    <span className={cn("eyebrow", className)}>
      {prefix && <span aria-hidden>{prefix} </span>}
      {children}
    </span>
  );
}

import { Skeleton } from "@/components/ui/Skeleton";

export default function ProLoading() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Skeleton className="h-3 w-24 mb-3 bg-bone/10" />
      <Skeleton className="h-9 w-2/3 mb-6 bg-bone/10" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full bg-bone/10" />
        <Skeleton className="h-16 w-full bg-bone/10" />
        <Skeleton className="h-16 w-full bg-bone/10" />
      </div>
    </div>
  );
}

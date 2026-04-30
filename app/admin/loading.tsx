import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="h-3 w-32 mb-3" />
      <Skeleton className="h-12 w-2/3 mb-6" />
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

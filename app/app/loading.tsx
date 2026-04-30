import { Skeleton } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-9 w-2/3 mb-2" />
      <Skeleton className="h-1 w-16 mb-6" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

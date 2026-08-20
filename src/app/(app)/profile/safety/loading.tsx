import { Skeleton } from "@/components/menarium/skeleton";

export default function SafetyLoading() {
  return (
    <div className="max-w-5xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-5 w-[34rem] max-w-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-lg" />
          ))}
        </div>
    </div>
  );
}

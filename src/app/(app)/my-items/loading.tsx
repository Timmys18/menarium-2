import { Skeleton } from "@/components/menarium/skeleton";

export default function MyItemsLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-md" />
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-4 rounded-lg border border-line-hairline p-4">
              <Skeleton className="h-52 rounded-md" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full rounded-control" />
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

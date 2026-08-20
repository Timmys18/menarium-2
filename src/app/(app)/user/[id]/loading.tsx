import { CardGridSkeleton, Skeleton } from "@/components/menarium/skeleton";

export default function PublicUserLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-8">
        <div className="flex flex-col gap-6 rounded-lg border border-line-hairline p-5 sm:flex-row sm:items-center sm:p-8">
          <Skeleton className="h-20 w-20 shrink-0 rounded-control sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-72 max-w-full" />
            <Skeleton className="h-5 w-40" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-36 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-44" />
          <CardGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}

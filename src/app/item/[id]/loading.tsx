import { CardGridSkeleton, Skeleton } from "@/components/menarium/skeleton";

export default function ItemLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mb-5 h-10 w-40 rounded-control" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
          <Skeleton className="aspect-[4/3] w-full rounded-card sm:rounded-panel" />
          <div className="space-y-5">
            <div className="space-y-5 rounded-card border border-white/8 bg-white/[0.03] p-5 sm:p-7">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <Skeleton className="h-11 w-4/5" />
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-28 w-full rounded-md" />
              <Skeleton className="h-36 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-control" />
            </div>
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        </div>
        <div className="mt-10 border-t border-white/8 pt-8 sm:mt-14 sm:pt-10">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="mt-3 h-9 w-64 max-w-full rounded-xs" />
          <Skeleton className="mb-6 mt-3 h-5 w-[520px] max-w-full rounded-full" />
          <CardGridSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

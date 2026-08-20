import { Skeleton } from "@/components/menarium/skeleton";

export default function ExchangeLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="order-1 space-y-3 rounded-lg border border-line-hairline p-4">
            <Skeleton className="h-8 w-52" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-4 rounded-md border border-line-hairline p-4">
                <Skeleton className="h-24 w-44 shrink-0 rounded-control" />
                <div className="flex-1 space-y-3 py-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="order-2 space-y-4 rounded-lg border border-line-hairline p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-control" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-control" />
            <Skeleton className="h-72 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

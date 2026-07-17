import { Skeleton } from "@/components/menarium/skeleton";

export default function ExchangeLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-[22px]" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="order-2 space-y-3 rounded-[28px] border border-white/8 p-4 lg:order-1">
            <Skeleton className="h-8 w-52" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-4 rounded-[20px] border border-white/7 p-4">
                <Skeleton className="h-24 w-44 shrink-0 rounded-[14px]" />
                <div className="flex-1 space-y-3 py-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 space-y-4 rounded-[28px] border border-white/8 p-5 lg:order-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-[14px]" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-40 w-full rounded-[20px]" />
            <Skeleton className="h-16 w-full rounded-[16px]" />
            <Skeleton className="h-72 w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

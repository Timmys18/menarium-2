import { Skeleton } from "@/components/menarium/skeleton";

export default function ItemLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mb-5 h-10 w-40 rounded-[14px]" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
          <Skeleton className="aspect-[4/3] w-full rounded-[24px] sm:rounded-[32px]" />
          <div className="space-y-5">
            <div className="space-y-5 rounded-[24px] border border-white/8 bg-white/[0.025] p-5 sm:p-7">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <Skeleton className="h-11 w-4/5" />
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-28 w-full rounded-[20px]" />
              <Skeleton className="h-36 w-full rounded-[18px]" />
              <Skeleton className="h-12 w-full rounded-[16px]" />
            </div>
            <Skeleton className="h-72 w-full rounded-[24px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

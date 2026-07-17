import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <div className="flex items-center gap-4 rounded-[28px] border border-white/7 p-5 sm:p-6">
          <Skeleton className="h-[72px] w-[72px] rounded-[20px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-52 max-w-full" />
            <Skeleton className="h-5 w-72 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-[28px]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[28px]" />
          ))}
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Skeleton className="h-72 rounded-[28px]" />
            <Skeleton className="h-80 rounded-[28px]" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-72 rounded-[28px]" />
            <Skeleton className="h-56 rounded-[28px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

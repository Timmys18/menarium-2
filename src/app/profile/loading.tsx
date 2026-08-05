import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileLoading() {
  return (
    <div className="rounded-[28px] border border-white/8 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-52 max-w-full" />
        </div>
        <Skeleton className="h-10 w-24 rounded-[14px]" />
      </div>
      <Skeleton className="mt-5 h-14 w-full rounded-[18px]" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-96 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

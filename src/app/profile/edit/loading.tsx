import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileEditLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-20 sm:px-6 md:pt-28">
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-80 max-w-full" />
          <Skeleton className="h-5 w-[34rem] max-w-full" />
        </div>
        <div className="space-y-5 rounded-[28px] border border-white/8 p-5 sm:p-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-11 w-44 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
        <Skeleton className="h-80 rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileEditLoading() {
  return (
    <div className="max-w-3xl space-y-6">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-80 max-w-full" />
          <Skeleton className="h-5 w-[34rem] max-w-full" />
        </div>
        <div className="space-y-5 rounded-lg border border-line-hairline p-5 sm:p-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 shrink-0 rounded-control" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-11 w-44 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

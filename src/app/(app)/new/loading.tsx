import { Skeleton } from "@/components/menarium/skeleton";

export default function NewItemLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 space-y-3 text-center">
          <Skeleton className="mx-auto h-4 w-40" />
          <Skeleton className="mx-auto h-11 w-80 max-w-full" />
          <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
        </div>
        <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-line-hairline p-5">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-control" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-32 w-full rounded-control" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
      </div>
    </div>
  );
}

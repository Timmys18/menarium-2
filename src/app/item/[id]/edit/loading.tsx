import { Skeleton } from "@/components/menarium/skeleton";

export default function EditItemLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-72 max-w-full" />
        </div>
        <div className="space-y-4 rounded-lg border border-line-hairline p-5">
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-24 shrink-0 rounded-control" />
            ))}
          </div>
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

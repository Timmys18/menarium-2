import { Skeleton } from "@/components/menarium/skeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-11 w-80 max-w-full" />
        </div>
        {/* Плитки со сводными числами. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
        {/* Списки жалоб, объявлений и пользователей. */}
        {Array.from({ length: 2 }).map((_, section) => (
          <div key={section} className="space-y-3 rounded-lg border border-line-hairline p-5">
            <Skeleton className="h-6 w-48" />
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center gap-4 rounded-md border border-line-hairline p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
                <Skeleton className="h-9 w-24 shrink-0 rounded-control" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

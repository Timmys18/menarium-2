import { Skeleton } from "@/components/menarium/skeleton";

export default function ItemThreadLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-5 w-28" />
        <div className="space-y-5 rounded-lg border border-white/8 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-control" />
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
            <Skeleton className="h-44 rounded-md" />
            <Skeleton className="h-[28rem] rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

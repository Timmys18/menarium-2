import { Skeleton } from "@/components/menarium/skeleton";

export default function ExchangeLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-64" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}

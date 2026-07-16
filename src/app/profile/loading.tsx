import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex items-center gap-4 rounded-3xl border border-white/5 p-8">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

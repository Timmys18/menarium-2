import { Skeleton } from "@/components/menarium/skeleton";

export default function ProfileChatsLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-14 w-48 rounded-[20px]" />
        <div className="space-y-1 rounded-[28px] border border-white/8 p-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-3">
              <Skeleton className="h-12 w-12 rounded-[15px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

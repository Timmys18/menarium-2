import { Skeleton } from "@/components/menarium/skeleton";

export default function SwipeLoading() {
  return (
    <div className="min-h-screen px-4 pb-52 pt-20 sm:px-6 md:pb-32 md:pt-28">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 space-y-3 text-center">
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-11 w-72 max-w-full" />
          <Skeleton className="mx-auto h-5 w-full max-w-xl" />
        </div>
        {/* Карточка свайпа — единственный элемент экрана, её пропорции и держим. */}
        <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-control" />
          ))}
        </div>
      </div>
    </div>
  );
}

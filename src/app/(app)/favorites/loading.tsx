import { CardGridSkeleton } from "@/components/menarium/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-shell">
        <div className="mb-4 h-4 w-36 animate-pulse rounded-full bg-fill-3" />
        <div className="mb-3 h-12 w-72 max-w-full animate-pulse rounded-control bg-fill-3" />
        <div className="mb-10 h-5 w-[520px] max-w-full animate-pulse rounded-full bg-fill-2" />
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}

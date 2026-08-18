import { CardGridSkeleton } from "@/components/menarium/skeleton";

export default function CatalogLoading() {
  return (
    <div className="min-h-screen px-4 pb-32 pt-24 sm:px-6 md:pt-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 h-4 w-44 animate-pulse rounded-full bg-white/[0.07]" />
        <div className="mb-8 h-12 w-96 max-w-full animate-pulse rounded-control bg-white/[0.07]" />
        <div className="mb-8 h-16 animate-pulse rounded-md bg-white/[0.07]" />
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}

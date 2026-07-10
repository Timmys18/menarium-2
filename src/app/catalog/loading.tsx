import { CardGridSkeleton } from "@/components/menarium/skeleton";

export default function CatalogLoading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 h-12 w-80 max-w-full animate-pulse rounded-2xl bg-white/10" />
        <div className="mb-8 h-16 animate-pulse rounded-2xl bg-white/10" />
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}

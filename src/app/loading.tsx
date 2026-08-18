import { CardGridSkeleton } from "@/components/menarium/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen px-6 pb-32 pt-28">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-3">
          <div className="h-10 w-64 animate-pulse rounded-control bg-white/[0.10]" />
          <div className="h-5 w-96 max-w-full animate-pulse rounded-xs bg-white/[0.10]" />
        </div>
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}

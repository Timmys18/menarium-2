import { FavoritesPageContent } from "@/app/(app)/favorites/page";

export const dynamic = "force-dynamic";

export default function ProfileFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return <FavoritesPageContent searchParams={searchParams} />;
}

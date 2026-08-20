import { ExchangePageContent } from "@/app/(app)/exchange/page";

export const dynamic = "force-dynamic";

export default function ProfileExchangesPage({
  searchParams,
}: {
  searchParams: Promise<{ swap?: string; tab?: string; filter?: string; page?: string; notice?: string }>;
}) {
  return <ExchangePageContent searchParams={searchParams} />;
}

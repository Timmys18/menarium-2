import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfileExchangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry));
    else if (value !== undefined) search.set(key, value);
  });

  redirect(search.size > 0 ? `/exchange?${search.toString()}` : "/exchange");
}

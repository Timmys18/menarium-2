import { redirect } from "next/navigation";

type SearchParams = {
  notice?: string | string[];
  status?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// This legacy URL remains shareable, but the content belongs to the account shell.
export default async function MyItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const profileParams = new URLSearchParams();
  const status = firstParam(params.status);
  const notice = firstParam(params.notice);

  if (status) profileParams.set("status", status);
  if (notice) profileParams.set("notice", notice);

  redirect(`/profile${profileParams.size ? `?${profileParams.toString()}` : ""}`);
}

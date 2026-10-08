import { redirect } from 'next/navigation';

export default async function LegacyIngestRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const qs = toQueryString(await searchParams);
  redirect(`/transactions/import${qs}`);
}

function toQueryString(params: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => q.append(key, v));
    else if (value !== undefined) q.set(key, value);
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

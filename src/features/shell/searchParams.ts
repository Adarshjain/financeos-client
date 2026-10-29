/** A page's `searchParams` prop: a promise of the address's query, repeated keys as arrays. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The first value of a query key (a repeated key arrives as an array). */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The query once awaited: what a parser takes. */
export type SearchParamsRecord = Awaited<SearchParams>;

import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface InboxUrl {
  /** The inbox item a link points at (`?item=`), or null. */
  highlightKey: string | null;
}

/** What an /inbox address asks for: `?item=` highlights one row. */
export function parseInboxUrl(params: SearchParamsRecord): InboxUrl {
  return { highlightKey: first(params.item) || null };
}

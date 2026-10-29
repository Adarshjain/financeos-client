import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface DebugUrl {
  /** A request reference to look up on arrival (`?ref=`). */
  initialRef: string | undefined;
  /** The lookup type (`?type=`). */
  initialType: string | undefined;
}

/** What a /settings/debug address asks for: a reference to look up, and its type. */
export function parseDebugUrl(params: SearchParamsRecord): DebugUrl {
  return { initialRef: first(params.ref), initialType: first(params.type) };
}
